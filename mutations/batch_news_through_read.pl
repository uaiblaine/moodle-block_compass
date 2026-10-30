s/const news = read<NewsAnswer>\('block_compass_get_news', \{\}, batch\.then\(\(answers\) => answers\[1\] as NewsAnswer\)\);/const news = batch.then((answers) => answers[1] as NewsAnswer);/;
