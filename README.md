# A scraper

`./index.js`

This will scrape the OpenAustralia Hansard XML to create an sqlite database of speech.

# A corpus generator

`./output.js`

This will query the afore mentioned sqlite database and output a speech corpus suitable for training an RNN.
