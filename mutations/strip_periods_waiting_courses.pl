s/foreach \(\$day\['waitingcourseids'\] \?\? \[\] as \$courseid\)/foreach (\$day['courseids'] ?? [] as \$courseid)/;
