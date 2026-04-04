import kopf
import kubernetes

try:
    kubernetes.config.load_incluster_config()
except kubernetes.config.ConfigException:
    kubernetes.config.load_kube_config()

apps_v1 = kubernetes.client.AppsV1Api()
core_v1 = kubernetes.client.CoreV1Api()

def deployment_exists(name, namespace):
    try:
        apps_v1.read_namespaced_deployment(name=name, namespace=namespace)
        return True
    except kubernetes.client.exceptions.ApiException as e:
        if e.status == 404:
            return False
        raise

def pvc_exists(name, namespace):
    try:
        core_v1.read_namespaced_persistent_volume_claim(name=name, namespace=namespace)
        return True
    except kubernetes.client.exceptions.ApiException as e:
        if e.status == 404:
            return False
        raise

def make_pvc(name, storage='1Gi'):
    # This is the "form" asking GKE for a hard drive
    # storage='1Gi' means 1 gigabyte
    return {
        'apiVersion': 'v1',
        'kind': 'PersistentVolumeClaim',
        'metadata': {'name': name},
        'spec': {
            'accessModes': ['ReadWriteOnce'],  # only one pod can use it at a time
            'resources': {'requests': {'storage': storage}}
            # no storageClassName needed — GKE picks the default automatically
        }
    }

def make_deployment(name, image, ports, env=None, volume_name=None, mount_path=None):
    container = {
        'name': name,
        'image': image,
        'ports': [{'containerPort': p} for p in ports],
        **(({'env': env}) if env else {})
    }

    spec = {'containers': [container]}

    # If a volume is requested, attach the PVC and mount it inside the container
    if volume_name and mount_path:
        container['volumeMounts'] = [{'name': 'data', 'mountPath': mount_path}]
        spec['volumes'] = [{'name': 'data', 'persistentVolumeClaim': {'claimName': volume_name}}]

    return {
        'apiVersion': 'apps/v1',
        'kind': 'Deployment',
        'metadata': {'name': name},
        'spec': {
            'replicas': 1,
            'selector': {'matchLabels': {'app': name}},
            'template': {
                'metadata': {'labels': {'app': name}},
                'spec': spec
            }
        }
    }

@kopf.on.create('krishoperator.dev', 'v1', 'apiservices')
def create_service(spec, name, namespace, **kwargs):
    service_type = spec.get('type')
    deploy_name = f'artemis-{service_type}'
    pvc_name = f'artemis-{service_type}-pvc'

    if deployment_exists(deploy_name, namespace):
        print(f'{service_type} already running, skipping')
        return

    if service_type == 'postgres':
        # Create the PVC first, then the deployment pointing at it
        # /var/lib/postgresql/data is where postgres stores everything
        if not pvc_exists(pvc_name, namespace):
            core_v1.create_namespaced_persistent_volume_claim(namespace, make_pvc(pvc_name))
            print(f'PVC created for postgres')
        dep = make_deployment(
            deploy_name, 'postgres:15', [5432],
            env=[
                {'name': 'POSTGRES_PASSWORD', 'value': 'password123'},
                {'name': 'POSTGRES_DB', 'value': 'mydb'},
                {'name': 'PGDATA', 'value': '/var/lib/postgresql/data/pgdata'}
            ],
            volume_name=pvc_name,
            mount_path='/var/lib/postgresql/data'
        )

    elif service_type == 'redis':
        # /data is where redis dumps its snapshot file
        if not pvc_exists(pvc_name, namespace):
            core_v1.create_namespaced_persistent_volume_claim(namespace, make_pvc(pvc_name))
            print(f'PVC created for redis')
        dep = make_deployment(
            deploy_name, 'redis:7', [6379],
            volume_name=pvc_name,
            mount_path='/data'
        )

    elif service_type == 'minio':
        dep = {
            'apiVersion': 'apps/v1',
            'kind': 'Deployment',
            'metadata': {'name': deploy_name},
            'spec': {
                'replicas': 1,
                'selector': {'matchLabels': {'app': deploy_name}},
                'template': {
                    'metadata': {'labels': {'app': deploy_name}},
                    'spec': {'containers': [{
                        'name': deploy_name,
                        'image': 'quay.io/minio/minio:latest',
                        'args': ['server', '/data', '--console-address', ':9001'],
                        'env': [
                            {'name': 'MINIO_ROOT_USER', 'value': 'admin'},
                            {'name': 'MINIO_ROOT_PASSWORD', 'value': 'password123'}
                        ],
                        'ports': [{'containerPort': 9000}, {'containerPort': 9001}]
                    }]}
                }
            }
        }

    elif service_type == 'grafana':
        dep = make_deployment(deploy_name, 'grafana/grafana:latest', [3000])

    else:
        print(f'Unknown service type: {service_type}')
        return

    apps_v1.create_namespaced_deployment(namespace, dep)
    print(f'{service_type} deployed as {deploy_name}')

if __name__ == '__main__':
    kopf.run()