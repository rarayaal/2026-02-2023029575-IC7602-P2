# Servidor web Apache HTTP para servir contenido estático de origen
FROM httpd:2.4-alpine

# Copia los archivos estáticos al directorio de publicación predeterminado
COPY public-html/ /usr/local/apache2/htdocs/

# Puerto estándar de publicación HTTP
EXPOSE 80