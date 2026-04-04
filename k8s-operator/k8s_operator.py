import kopf
import kubernetes

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

def make_deployment(name, image, ports, env=None):
    return {
        'apiVersion': 'apps/v1',
        'kind': 'Deployment',
        'metadata': {'name': name},
        'spec': {
            'replicas': 1,
            'selector': {'matchLabels': {'app': name}},
            'template': {
                'metadata': {'labels': {'app': name}},
                'spec': {'containers': [{
                    'name': name,
                    'image': image,
                    'ports': [{'containerPort': p} for p in ports],
                    **(({'env': env}) if env else {})
                }]}
            }
        }
    }

@kopf.on.create('krishoperator.dev', 'v1', 'apiservices')
def create_service(spec, name, namespace, **kwargs):
    service_type = spec.get('type')
    deploy_name = f'artemis-{service_type}'

    if deployment_exists(deploy_name, namespace):
        print(f'{service_type} already running, skipping')
        return

    if service_type == 'postgres':
        dep = make_deployment(deploy_name, 'postgres:15', [5432], env=[
            {'name': 'POSTGRES_PASSWORD', 'value': 'password123'},
            {'name': 'POSTGRES_DB', 'value': 'mydb'}
        ])
    elif service_type == 'redis':
        dep = make_deployment(deploy_name, 'redis:7', [6379])
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