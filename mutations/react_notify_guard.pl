s/(=> \{\n)    try \{\n        (const notification = await amd<NotificationModule>\('core\/notification'\);\n)/$1    $2    try {\n/;
