s/        try \{\n            (\\core\\di::get\(manager::class\)->dispatch\(\$hook\);)\n        \} catch \(\\Throwable \$e\) \{\n[^\n]*\n\n            return \[\];\n        \}/        $1/;
