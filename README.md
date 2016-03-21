# A scraper

`./scraper.js`

This will scrape the OpenAustralia Hansard XML to create an sqlite database of speech.

# A corpus generator

`./export.js`

This will query the afore mentioned sqlite database and output a speech corpus suitable for training an RNN.
