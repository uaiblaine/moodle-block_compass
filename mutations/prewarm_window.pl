s/                  WHERE u\.lastaccess >= :since AND u\.deleted = 0 AND u\.suspended = 0 AND u\.id > :cursor/                  WHERE u.deleted = 0 AND u.suspended = 0 AND u.id > :cursor/;
