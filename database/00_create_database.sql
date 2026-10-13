-- Ejecutar este script conectado a la base "postgres" en pgAdmin 4.
-- Si la base ya existe, omite este paso y abre el Query Tool de "globalizat".

CREATE DATABASE globalizat
  WITH
  OWNER = postgres
  ENCODING = 'UTF8'
  TEMPLATE = template0;
