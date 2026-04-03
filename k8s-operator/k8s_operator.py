import kopf
import kubernetes
import yaml

kubernetes.config.load_kube_config()
apps_v1 = kubernetes.client.AppsV1Api()
core_v1 = kubernetes.client.CoreV1Api()

@kopf.on.create('krishoperator.dev', 'v1', 'apiservices')
def create_service(spec, name, namespace, **kwargs):
    service_type = spec.get('type')
    
    if service_type == 'postgres':
        deployment = {
            'apiVersion': 'apps/v1',
            'kind': 'Deployment',
            'metadata': {'name': f'{name}-postgres', 'namespace': namespace},
            'spec': {
                'replicas': 1,
                'selector': {'matchLabels': {'app': f'{name}-postgres'}},
                'template': {
                    'metadata': {'labels': {'app': f'{name}-postgres'}},
                    'spec': {'containers': [{
                        'name': 'postgres',
                        'image': 'postgres:15',
                        'env': [
                            {'name': 'POSTGRES_PASSWORD', 'value': 'password123'},
                            {'name': 'POSTGRES_DB', 'value': 'mydb'}
                        ],
                        'ports': [{'containerPort': 5432}]
                    }]}
                }
            }
        }
        apps_v1.create_namespaced_deployment(namespace, deployment)
        print(f'Postgres deployed for {name}')
    elif service_type == 'redis':
        deployment = {
            'apiVersion': 'apps/v1',
            'kind': 'Deployment',
            'metadata': {'name': f'{name}-redis', 'namespace': namespace},
            'spec': {
                'replicas': 1,
                'selector': {'matchLabels': {'app': f'{name}-redis'}},
                'template': {
                    'metadata': {'labels': {'app': f'{name}-redis'}},
                    'spec': {'containers': [{
                        'name': 'redis',
                        'image': 'redis:7',
                        'ports': [{'containerPort': 6379}]
                    }]}
                }
            }
        }
        apps_v1.create_namespaced_deployment(namespace, deployment)
        print(f'Redis deployed for {name}')
    else:
        print(f'Unknown service type: {service_type}')

if __name__ == '__main__':
    kopf.run()