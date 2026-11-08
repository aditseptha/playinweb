insert into private.admins (email) values ('rizkyerdiansyah@gmail.com')
on conflict (email) do nothing;
