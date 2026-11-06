# Proyecto 2 — Proxy/caché de aplicación con geolocalización

IC-7602 Redes · Tecnológico de Costa Rica · II Semestre 2026

## Integrantes

| Carné      | Nombre                   |
| ---------- | ------------------------ |
| 2022104884 | Isaac Rojas Robles       |
| 2023029575 | Rafael Araya Álvarez     |
| 2020030408 | Luis Diego Delgado Muñoz |
| 2020426226 | Otto Segura Ruiz         |
| 2026801601 | Alexandra De Gracia      |

## Inicio rápido

```bash
cp .env.example .env          # completar los valores
docker compose up --build -d  # stack completo en Docker
./helm/deploy.sh              # o despliegue en Kubernetes con Helm
```

| Componente | En producción |
| --- | --- |
| UI | https://ic7602-p2-ui-chi.vercel.app |
| REST API en Node.js | https://ic7602-p2-node-api.vercel.app/api |
