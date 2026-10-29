# Flujo de compra completo

Este recorrido valida manualmente el frontend, la API y PostgreSQL. Requiere la plataforma local iniciada con `npm run start:all`; la demo pública de Pages no sirve para comprobar la integración full-stack.

## 1. Iniciar sesión como cliente

1. Abre <http://127.0.0.1:4173>.
2. Pulsa **Entrar con la cuenta de demostración**.
3. Como alternativa, usa las credenciales **locales de demostración**:
   - correo: `lucia.benitez@example.com`
   - contraseña: `Demo12345!`
4. Confirma que se muestra la tienda y el acceso a **Mi cuenta**.

## 2. Elegir un producto

1. Entra en **Catálogo**.
2. Abre un producto.
3. Comprueba que el detalle muestra el visor 3D cuando existe un GLB; arrastra para rotar y usa la rueda o gesto para acercar.
4. Si el producto ofrece variantes, cambia la presentación y verifica que se actualicen el modelo, el precio o el stock correspondiente.
5. Selecciona una cantidad disponible y pulsa **Añadir al carrito**.

## 3. Revisar el carrito

1. Abre el carrito desde la barra de navegación.
2. Verifica producto, variante, cantidad, moneda, precio unitario y total.
3. Modifica la cantidad una vez y confirma que el total y las restricciones de stock se recalculen.
4. Pulsa **Continuar compra** para avanzar al checkout.

## 4. Completar el checkout de cinco pasos

El pago es simulado. Los campos de tarjeta se validan únicamente en el navegador y nunca se envían ni almacenan.

1. **Datos personales:** revisa nombre, apellido, correo y teléfono; completa cualquier dato obligatorio.
2. **Dirección:** elige una dirección guardada o introduce una dirección de prueba completa.
3. **Pago simulado:** usa datos ficticios. Por ejemplo:
   - titular: `Cliente Demo`
   - número: `4242 4242 4242 4242`
   - vencimiento: una fecha futura con formato solicitado por la interfaz
   - CVV: `123`
4. **Revisión:** verifica productos, cantidades, dirección, moneda y total. Si los datos coinciden, confirma la compra con **Confirmar compra simulada**.
5. **Confirmación:** comprueba el resultado y conserva el identificador `ORD-…` mostrado.

Durante la confirmación, el backend vuelve a validar precio y existencias, descuenta stock en una transacción y usa `requestId` para evitar duplicados por reintento.

## 5. Verificar la cuenta

1. Abre **Mi cuenta > Historial de pedidos** y localiza el identificador creado.
2. Abre el detalle y verifica líneas, total y snapshot de la dirección.
3. Entra en **Mi cuenta > Seguimiento**.
4. Abre el pedido activo y comprueba la línea de tiempo. Este seguimiento es un escenario ficticio: no consulta un transportista real y puede avanzar al entrar en la sección.

## 6. Verificar como administrador

1. Cierra la sesión del cliente.
2. Inicia sesión con las credenciales **locales de demostración** de administración:
   - correo: `admin@globalizat.demo`
   - contraseña: `Admin12345!`
3. Entra en **Administración** desde el enlace **Administración** del pie de página o abre <http://127.0.0.1:4173/#/admin>; luego ve a **Pedidos** y busca el pedido creado.
4. Revisa su detalle, usuario, líneas, total y dirección.
5. Abre **Administración > Inventario**.
6. Confirma que el stock general y, si corresponde, el de la variante se redujeron en la cantidad comprada.

## Resultado esperado

- El pedido aparece para el cliente y para administración.
- El pago no produjo datos de tarjeta en la API ni en PostgreSQL.
- El precio y la dirección quedaron como snapshot histórico.
- El stock se descontó una sola vez.
- La repetición de la misma solicitud con el mismo `requestId` no creó otro pedido.
