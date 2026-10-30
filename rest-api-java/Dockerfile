# Etapa 1: Compilación del JAR autocontenido con Maven
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /build

# Copia descriptores y descarga dependencias para optimizar la caché de Docker
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# Copia el código fuente y genera el paquete
COPY src ./src
RUN mvn -B -q clean package -DskipTests

# Etapa 2: Imagen mínima de ejecución con JRE
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Crea usuario sin privilegios para ejecución segura en contenedor
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /build/target/rest-api-java.jar app.jar

USER appuser

# Variables de entorno por defecto
ENV REST_API_HOST=0.0.0.0 \
    REST_API_PORT=8080

EXPOSE 8080

CMD ["java", "-jar", "app.jar"]