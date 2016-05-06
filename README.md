# Apache solr search integration for the IrisJS framework

## Description 
Integrate a fully featured search engine into your Iris site. Apache solr is a popular open-source search based on Lucene. Out of the box with this module you can choose which entity types you want to be indexed as well as which fields within those types should be indexed. A basic search page is provided at http://yoursite.com/search

## Quick install

1. In your project directory run 'npm install irisjs-apachesolr'
2. Install Apache Solr (tested on version 5.5.0)
   - wget http://archive.apache.org/dist/lucene/solr/5.5.0/solr-5.5.0.zip
   - unzip -q solr-5.5.0.zip
   - cd solr-5.5.0.zip
   - bin/solr start -e cloud -noprompt
   - bin/solr create -c iris
3. Enable the irisjs-apachesolr module on your iris site - yoursite.com/admin/modules 


## Configure solr

At /admin/config/search/solr enter the connection details for you solr instance. Example based on solr setup above:
host: 127.0.0.1
port: 8983
core: iris_shard1_replica1
path: /solr

Go to /admin/config/search/solr/entities to choose which entities and fields should be indexed.

## How to use

1. Add or Update an entity
2. Navigate to /search
3. Search for an entity that you have added eg:
   For keyword search ?filter=foo
   or field specific searchs ?filter=fieldname:foo
4. enjoy and help improve the search POC page
