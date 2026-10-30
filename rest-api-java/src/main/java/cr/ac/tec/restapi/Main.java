package cr.ac.tec.restapi;

import io.javalin.Javalin;
import io.javalin.http.HttpStatus;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/* Servidor REST que implementa operaciones CRUD para pruebas de origen */
public class Main {
    private static final Map<String, Item> items = new ConcurrentHashMap<>();

    public static void main(String[] args) {
        /* Carga datos de prueba iniciales */
        seedData();

        /* Obtiene la configuración de red desde variables de entorno */
        String portEnv = System.getenv("PORT");
        if (portEnv == null || portEnv.isBlank()) {
            portEnv = System.getenv("REST_API_PORT");
        }
        int port = (portEnv != null && !portEnv.isBlank()) ? Integer.parseInt(portEnv) : 8080;

        String host = System.getenv("REST_API_HOST");
        if (host == null || host.isBlank()) {
            host = "0.0.0.0";
        }

        /* Inicializa y arranca el servidor HTTP Javalin */
        Javalin app = Javalin.create(config -> {
            config.showJavalinBanner = false;
        }).start(host, port);

        /* Verifica el estado del servicio */
        app.get("/health", ctx -> {
            ctx.status(HttpStatus.OK).json(Map.of("status", "UP", "service", "rest-api-java"));
        });

        /* Lista todos los elementos disponibles */
        app.get("/api/items", ctx -> {
            ctx.status(HttpStatus.OK).json(items.values());
        });

        /* Obtiene un elemento por su identificador */
        app.get("/api/items/{id}", ctx -> {
            String id = ctx.pathParam("id");
            Item item = items.get(id);
            if (item != null) {
                ctx.status(HttpStatus.OK).json(item);
            } else {
                ctx.status(HttpStatus.NOT_FOUND).json(Map.of("error", "Item no encontrado"));
            }
        });

        /* Crea un nuevo elemento */
        app.post("/api/items", ctx -> {
            Item newItem = ctx.bodyAsClass(Item.class);
            if (newItem.getId() == null || newItem.getId().isBlank()) {
                newItem.setId(UUID.randomUUID().toString().substring(0, 8));
            }
            items.put(newItem.getId(), newItem);
            ctx.status(HttpStatus.CREATED).json(newItem);
        });

        /* Actualiza un elemento existente */
        app.put("/api/items/{id}", ctx -> {
            String id = ctx.pathParam("id");
            if (!items.containsKey(id)) {
                ctx.status(HttpStatus.NOT_FOUND).json(Map.of("error", "Item no encontrado"));
                return;
            }
            Item updateData = ctx.bodyAsClass(Item.class);
            updateData.setId(id);
            items.put(id, updateData);
            ctx.status(HttpStatus.OK).json(updateData);
        });

        /* Elimina un elemento del almacén */
        app.delete("/api/items/{id}", ctx -> {
            String id = ctx.pathParam("id");
            Item removed = items.remove(id);
            if (removed != null) {
                ctx.status(HttpStatus.NO_CONTENT);
            } else {
                ctx.status(HttpStatus.NOT_FOUND).json(Map.of("error", "Item no encontrado"));
            }
        });

        System.out.printf("[REST API Java] Servidor escuchando en http://%s:%d\n", host, port);
    }

    /* Llena el almacén con elementos base para pruebas inmediatas */
    private static void seedData() {
        items.put("item-1", new Item("item-1", "Servidor Web", "Instancia de prueba para cache zonal", 150.0));
        items.put("item-2", new Item("item-2", "Balanceador DNS", "Interceptor DNS con geolocalizacion", 250.0));
        items.put("item-3", new Item("item-3", "Cache Zonal", "Nodo de almacenamiento perimetral en disco", 300.0));
    }
}
