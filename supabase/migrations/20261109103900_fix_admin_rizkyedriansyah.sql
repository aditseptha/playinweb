delete from private.admins where lower(email) = 'rizkyerdiansyah@gmail.com';

insert into private.admins (email) values ('rizkyedriansyah@gmail.com')
on conflict (email) do nothing;
