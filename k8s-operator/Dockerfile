FROM python:3.11-slim

WORKDIR /app

RUN pip install kopf kubernetes

COPY k8s_operator.py .

CMD ["python", "k8s_operator.py"]