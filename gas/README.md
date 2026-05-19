# GAS API

This folder contains code that is safe to keep in a public repository.
Do not write the real password in this folder.

## Deploy

1. Open the Google Apps Script editor.
2. Copy `Code.gs` into the Apps Script project.
3. Open Project Settings.
4. Add a Script Property:
   - Property: `APP_PASSWORD`
   - Value: the real login password
5. Deploy as a Web app.
6. Set the Web app URL in `script.js` as `API_ENDPOINT_URL`.

The API expects login requests like:

```json
{
  "action": "login",
  "password": "password typed by the user"
}
```

After login, normal requests must include:

```json
{
  "token": "session token returned by login"
}
```
