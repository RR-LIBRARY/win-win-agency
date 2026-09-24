# Create admin account

Set up an admin login for naveenbharatprism@gmail.com using the password the user gave.

## Steps
1. Check whether an account with this email already exists in the "Win Win Agency" project.
2. If it does not exist, create it with the email already confirmed, so the user can sign in right away without a confirmation email.
3. If it already exists, update its password to the one given and mark the email as confirmed.
4. Give this account the admin role (skip if it already has it). Its profile row is created automatically.
5. Test it: sign in on the /auth page and check that the Admin panel opens.

## Technical details
- Use the service-role Supabase admin API (`auth.admin.createUser` with `email_confirm: true`, or `updateUserById`) through a one-time script run from the sandbox. No app code changes.
- Insert `(user_id, 'admin')` into `public.user_roles` with `on conflict do nothing`.
- The password is used only in that one command. It will not be saved in code, logs or memory.

## Note
After signing in, change this password from the Profile page, because it was shared in chat.
