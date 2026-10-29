-- Ejecutar este script conectado a la base "postgres" en pgAdmin 4.
-- Si la base ya existe, omite este paso y abre el Query Tool de "globalizat".
-- El propietario será el rol que ejecute este script.

CREATE DATABASE globalizat
  WITH
  ENCODING = 'UTF8'
  TEMPLATE = template0;
