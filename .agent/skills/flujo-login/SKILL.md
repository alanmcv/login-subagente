---
name: flujo-login
description: Ejecuta el flujo completo para construir un sistema de login (base de datos → backend → frontend) usando los subagentes del proyecto. Úsala cuando pidan "crear login", "flujo de login", "sistema de login" o "implementar login paso a paso".
---

Coordina a los subagentes EN ORDEN. Tú eres el orquestador: los subagentes no se llaman entre sí,
tú le pasas a cada uno lo que necesita del anterior.

1. **base-datos**: que cree la estructura de la base de datos, la tabla de usuarios con contraseñas hasheadas y un usuario demo para pruebas.
2. **backend**: pásale los datos del modelo del paso 1. Que implemente los endpoints de login (`/api/login`), registro y verificación de token.
3. **frontend**: pásale los endpoints del paso 2. Que construya la interfaz del formulario de login, la validación y la vista protegida con logout.
4. **Verificación**: prueba el flujo completo iniciando sesión con el usuario demo y verificando que rechace credenciales inválidas.

Al final, muestra una tabla resumen:
| Etapa | Subagente | Resultado |
y las instrucciones para ejecutar y probar el login.
