s/\(int\) \$time >= \$now && \(int\) \$time <= \$now \+ \$horizon/(int) \$time > \$now && (int) \$time <= \$now + \$horizon/;
