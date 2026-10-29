# Problemas conocidos y próximos pasos

## Limitaciones actuales

| Área | Limitación | Impacto |
|---|---|---|
| Sesiones | El backend guarda sesiones en memoria y el frontend conserva el token solo en memoria. | Recargar la página o reiniciar el backend cierra la sesión. No funciona entre instancias. |
| Carrito | Todo el carrito vive en memoria del navegador. | Recargar pierde su contenido. |
| Store | El backend carga el estado completo en memoria. | El consumo crece con los datos y otras instancias no ven cambios. |
| Escrituras | Cada modificación reescribe todas las tablas de aplicación en una sola transacción. | Es consistente para la demo, pero costoso y no escalable. |
| Concurrencia | El modelo está pensado para un único proceso. | Varias instancias podrían sobrescribir estado y sus sesiones serían incompatibles. |
| Medios | Las cargas se guardan en `backend/uploads/`, disco local ignorado por Git. | No hay réplica, CDN ni persistencia garantizada al redesplegar. |
| Pago | La tarjeta se valida solo en frontend y no existe pasarela. | No se procesa dinero; todo pago es ficticio. |
| Monedas | Las tasas PYG/USD/EUR son fijas e inventadas. | Los importes convertidos no representan el mercado. |
| Tracking | El seguimiento avanza como escenario local. | No refleja transportistas ni ubicaciones reales. |
| Esquema | No existe sistema de migraciones. | Cambios futuros requieren un plan manual para preservar datos. |
| CSS | `base.css`, `components.css` y `layout.css` no son importados por `main.css`. | Son legado y pueden confundir mantenimiento o quedar desactualizados. |
| Pruebas de navegador | `tests/*.cjs` requieren Playwright/Edge y son opcionales. | `npm test` no cubre los recorridos completos del navegador. |
| Demo pública | Pages sirve un tag frontend congelado con mocks. | No permite evaluar la integración full-stack actual. |
| Producción | No hay hosting, backups, observabilidad, rate limiting, recuperación de cuenta ni MFA. | El sistema no está preparado para usuarios/datos reales. |

## Próximos pasos recomendados

1. Persistir sesiones con cookies `HttpOnly`, `Secure`, `SameSite` y un almacén compartido; agregar rotación/expiración y protección CSRF según el diseño.
2. Sustituir el store completo por repositorios SQL de operaciones incrementales y control de concurrencia.
3. Adoptar migraciones versionadas, backups y restauraciones probadas.
4. Mover uploads a almacenamiento de objetos con URLs firmadas, validación de contenido y política de borrado.
5. Persistir el carrito por usuario o en almacenamiento local con reconciliación de stock.
6. Integrar una pasarela solo si el alcance deja de ser académico; nunca almacenar datos de tarjeta directamente.
7. Consumir tasas autorizadas o eliminar la conversión si no puede mantenerse.
8. Automatizar pruebas E2E en CI con navegador fijado y una base `_test` efímera.
9. Añadir logs estructurados, métricas, trazas, límites de solicitudes y alertas.
10. Retirar o integrar conscientemente los CSS heredados y documentar la decisión.
