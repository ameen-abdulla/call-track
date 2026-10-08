# Call Track CLI Tools

## `reset-admin.js` — Reset Administrator Password

Use this tool if you have forgotten the admin password.

### Recommended usage (Docker — interactive, secure)

```bash
docker exec -it call-track node /app/cli/reset-admin.js
```

You will be prompted for your admin email and new password.
The password is **not visible** as you type.

### Development usage

```bash
DATABASE_URL=file:/path/to/dev.db node cli/reset-admin.js
```

### Non-interactive (avoid — credentials appear in shell history)

```bash
docker exec -it call-track node /app/cli/reset-admin.js --email=admin@example.com --password=SecurePass123!
```

Always prefer the interactive prompt to avoid credentials appearing in terminal history.

## Security Notes

- Passwords are bcrypt-hashed at cost factor 10 before being stored in the database
- The script never logs, echoes, or writes the plaintext password anywhere
- Interactive password prompts do not display typed characters
- Only use `--password=...` arguments in fully secured, non-logged environments
