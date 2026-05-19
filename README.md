# ChromaAid

ChromaAid es una PWA de apoyo cromático para personas con daltonismo. La app permite iniciar sesión, realizar un test orientativo, detectar colores con cámara o imagen, comparar colores, jugar un reto visual y consultar un historial de resultados.

## Tecnologías usadas

- HTML5 para la estructura de pantallas.
- CSS3 responsive para diseño visual.
- JavaScript puro para navegación, lógica, cámara, formularios y juegos.
- localStorage como base de datos local de demostración.
- Service Worker y manifest para soporte PWA básico.

## Estructura del proyecto

- `index.html`: contiene todas las pantallas de la app.
- `style.css`: contiene el diseño responsive y componentes visuales.
- `app.js`: contiene navegación, login, test, herramientas, juego e historial.
- `manifest.json`: configuración PWA.
- `service-worker.js`: registro básico de service worker.
- `icons/`: iconos animados del menú.
- `img/`: imágenes Ishihara del test.

## Pantallas principales

- Login: permite iniciar sesión.
- Registro: guarda nuevos usuarios localmente.
- Recuperar contraseña: verifica si un correo existe en la demo local.
- Home: muestra el menú principal y datos curiosos.
- Test de Daltonismo: test orientativo con placas Ishihara.
- Detectar Color: detecta colores desde cámara o imagen.
- Comparar Colores: analiza contraste y simulación de daltonismo.
- Encuentra el Color Diferente: juego de percepción visual.
- Historial: muestra, filtra, busca y detalla registros guardados.

## Base de datos

La app usa `localStorage`.

- Usuarios: `chromaaid_users`.
- Sesión activa: `chromaaid_session`.
- Historial: `chromaaid_history`.

En `chromaaid_history` se guardan:

- Resultados del test.
- Detecciones de color.
- Comparaciones de colores.
- Resultados del juego.

Esta base de datos es local y sirve para demostración. Para una app real con seguridad, se recomienda usar Firebase Authentication, una API backend o una base de datos segura.


## Cómo modificar la app

- Colores principales: cambia variables CSS en `:root` dentro de `style.css`.
- Iconos del menú: reemplaza imágenes dentro de `icons/`.
- Datos curiosos: edita el arreglo `facts` en `app.js`.
- Preguntas del test: edita el arreglo `questions` en `app.js`.
- Gamas del juego: edita `differentFamilies` en `app.js`.
- Historial: revisa funciones `saveHistory()`, `renderHistory()` y `showHistoryDetail()`.

## Nota médica

ChromaAid es una herramienta orientativa. No sustituye una evaluación médica profesional. Para confirmar cualquier alteración en la percepción del color, se recomienda acudir con un optometrista u oftalmólogo.
