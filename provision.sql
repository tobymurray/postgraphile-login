DROP DATABASE IF EXISTS auth;
DROP ROLE IF EXISTS auth_anonymous;
DROP ROLE IF EXISTS auth_authenticated;
DROP ROLE IF EXISTS auth_postgraphql;

--- 

CREATE DATABASE auth;
\c auth
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; 
CREATE EXTENSION IF NOT EXISTS "citext"; 
CREATE SCHEMA auth_public; 
CREATE SCHEMA auth_private;

CREATE ROLE auth_postgraphql LOGIN PASSWORD 'password'; 
CREATE ROLE auth_anonymous; 
GRANT auth_anonymous TO auth_postgraphql; 
CREATE ROLE auth_authenticated; 
GRANT auth_authenticated TO auth_postgraphql;

CREATE TABLE auth_public.user ( 
  id              serial primary key, 
  first_name      text not null check (char_length(first_name) < 80), 
  last_name       text check (char_length(last_name) < 80), 
  created_at      timestamp default now() 
);

CREATE TABLE auth_private.user_account ( 
  user_id         integer primary key references auth_public.user(id) on delete cascade, 
  email           citext not null unique, 
  password_hash   text not null 
);

CREATE TYPE auth_public.jwt as ( 
  role    text, 
  user_id integer 
);

CREATE FUNCTION auth_public.current_user_id() RETURNS INTEGER AS $$
  SELECT current_setting('jwt.claims.user_id')::integer;
$$ LANGUAGE SQL STABLE;

ALTER TABLE auth_public.user ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_user ON auth_public.user FOR SELECT
  using(true);

CREATE POLICY update_user ON auth_public.user FOR UPDATE TO auth_authenticated 
  using (id = auth_public.current_user_id());

CREATE POLICY delete_user ON auth_public.user FOR DELETE TO auth_authenticated 
  using (id = auth_public.current_user_id());

CREATE FUNCTION auth_public.register_user( 
  first_name  text, 
  last_name   text, 
  email       text, 
  password    text 
) RETURNS auth_public.user AS $$ 
DECLARE 
  new_user auth_public.user; 
BEGIN 
  INSERT INTO auth_public.user (first_name, last_name) values 
    (first_name, last_name) 
    returning * INTO new_user; 
    
  INSERT INTO auth_private.user_account (user_id, email, password_hash) values 
    (new_user.id, email, crypt(password, gen_salt('bf'))); 
    
  return new_user; 
END; 
$$ language plpgsql strict security definer;

CREATE FUNCTION auth_public.authenticate ( 
  email text, 
  password text 
) returns auth_public.jwt as $$ 
DECLARE 
  account auth_private.user_account; 
BEGIN 
  SELECT a.* INTO account 
  FROM auth_private.user_account as a 
  WHERE a.email = $1; 

  if account.password_hash = crypt(password, account.password_hash) then 
    return ('auth_authenticated', account.user_id)::auth_public.jwt; 
  else 
    return null; 
  end if; 
END; 
$$ language plpgsql strict security definer;

CREATE FUNCTION auth_public.current_user() RETURNS auth_public.user AS $$ 
  SELECT * 
  FROM auth_public.user 
  WHERE id = auth_public.current_user_id()
$$ language sql stable;

GRANT USAGE ON SCHEMA auth_public TO auth_anonymous, auth_authenticated; 
GRANT SELECT ON TABLE auth_public.user TO auth_anonymous, auth_authenticated; 
GRANT UPDATE, DELETE ON TABLE auth_public.user TO auth_authenticated; 
GRANT EXECUTE ON FUNCTION auth_public.authenticate(text, text) TO auth_anonymous, auth_authenticated; 
GRANT EXECUTE ON FUNCTION auth_public.register_user(text, text, text, text) TO auth_anonymous; 
GRANT EXECUTE ON FUNCTION auth_public.current_user() TO auth_anonymous, auth_authenticated; 
