var fs = require('fs');
var nodegit = require('nodegit');
require('./irisjsEditor-forms.js');

var routes = {
  deploy: {
    "title": "Deploy",
    "description": "Pull your version controlled changes to the live branch",
    "permissions": ["can deploy editor"],
  },
  editor: {
    "title": "Editor",
    "description": "Browse directories and edit files",
    "permissions": ["can use editor"],
  },
  fetch: {
    "title": "Fetch all branches",
    "permissions": ["can fetch all"],
  },
  fetchLive: {
    "title": "Fetch all branches to live",
    "permissions": ["can fetch all live"],
  },
  checkoutLive: {
    "title": "Can checkout branch on live",
    "permissions": ["can checkout live"],
  },
};

/**
 * Page callback: Deploy changes to live.
 */
iris.route.get("/irisjs-editor/deploy", routes.deploy, function (req, res) {

  // Deploy changes to live.

  try{
  iris.modules.frontend.globals.parseTemplateFile(["deploy"], ['html'], {
    'current': req.irisRoute.options,
  }, req.authPass, req).then(function (success) {

    res.send(success);

  }, function (fail) {

    iris.modules.frontend.globals.displayErrorPage(500, req, res);

    iris.log("error", fail);

  });
  }
  catch(e){
    console.log(e);
  }

});

/**
 * Page callback: Fetch all branches.
 */
iris.route.get("/irisjs-editor/fetch-all/:target", routes.fetch, function (req, res) {

  // Deploy changes to live.
  iris.modules.frontend.globals.parseTemplateFile(["fetchAll"], null, {
    'current': req.irisRoute.options,
    'target' : req.params.target
  }, req.authPass, req).then(function (success) {

    res.send(success);

  }, function (fail) {

    iris.modules.frontend.globals.displayErrorPage(500, req, res);

    iris.log("error", fail);

  });

});

/**
 * Page callback: Merge branches.
 */
iris.route.get("/irisjs-editor/merge/:target", routes.deploy, function (req, res) {

  // Deploy changes to live.
  iris.modules.frontend.globals.parseTemplateFile(["merge"], null, {
    'current': req.irisRoute.options,
    'target' : req.params.target
  }, req.authPass, req).then(function (success) {

    res.send(success);

  }, function (fail) {

    iris.modules.frontend.globals.displayErrorPage(500, req, res);

    iris.log("error", fail);

  });

});

/**
 * Page callback: File browser and editor page.
 */
iris.route.get("/irisjs-editor/editor", routes.editor, function (req, res) {

  var cloneRepo = function() {

    var path = iris.sitePath;
    
    nodegit.Repository.open(path).then(function (repo) {

      repo.getRemote('origin', function () {}).then(function (remote) {

        var url = remote.url();
        
        iris.modules.frontend.globals.parseTemplateFile(["cloneRepo"], ['html'], {
          'current': req.irisRoute.options,
          'url' : url
        }, req.authPass, req).then(function (success) {

          res.send(success);

        }, function (fail) {

          iris.modules.frontend.globals.displayErrorPage(500, req, res);

          iris.log("error", fail);

        });

      });
    },function(err){
        
       iris.log("error", err);
    });

  }

  var userQuery = {
    entities: ['user'],
      queries: [{
        field: 'eid',
        operator: 'IS',
        value: req.authPass.userid
      }]
  };
  
  iris.invokeHook("hook_entity_fetch", "root", null, userQuery).then(function (docs) {
    
    
    if(req.query.operation)  {
      
      switch(req.query.operation){
        case "create_node" : 
          if(req.query.type == "file"){
            fs.writeFile(docs[0].git[0].gitpath + "/" + req.query.id, "", function(err) {
              if(err) {
                  console.log(err);
              } else {
                 res.json(req.query);
              }
            }); 
          }
          if(req.query.type == "default"){
            fs.mkdir(docs[0].git[0].gitpath + "/" + req.query.id,function(e){
                
                if(!e || (e && e.code === 'EEXIST')){
                    res.json(req.query);
                } else {
                    //debug
                   res.json({error:e});
                }
            });
          }
          break;
        case "delete_node" : 
          
          var deleteFolderRecursive = function(path) {
            if( fs.existsSync(path) ) {
              fs.readdirSync(path).forEach(function(file,index){
                var curPath = path + "/" + file;
                if(fs.lstatSync(curPath).isDirectory()) { // recurse
                  deleteFolderRecursive(curPath);
                } else { // delete file
                  fs.unlinkSync(curPath);
                }
              });
              fs.rmdirSync(path);
            }
          };
          var err = deleteFolderRecursive(docs[0].git[0].gitpath + "/" +req.query.id);
          if(err) {
            res.json({error:err});
          }
          else{
            res.json(req.query);
          }
           
          break;
        case "rename_node" : 
          var old_path = docs[0].git[0].gitpath + "/" + req.query.id.replace(req.query.text,req.query.old);
          var new_path = docs[0].git[0].gitpath + "/" + req.query.id;
          
          fs.rename(old_path,new_path,function(err){
            
              if(err) {
                res.json({error:err});
              }
             else{
               res.json(req.query);
             }
          });
          break;
        
      }
       
    }
    else{
      
      if (docs.length == 0 || !docs[0].git[0] || !docs[0].git[0].gitpath) {
                   
        cloneRepo();
        return;
  
      }
      else {
  
        var path = docs[0].git[0].gitpath;
         
        // Check filesystem exists
        try {
          fs.accessSync(path, fs.F_OK);
        } catch (e) {
          cloneRepo();
          return;
        }
  
          nodegit.Repository.open(path).then(function (repo) {
  
            var tree = iris.modules.irisjsEditor.globals.getFilesRecursive(path, repo, path);
  
            iris.modules.frontend.globals.parseTemplateFile(["fileBrowser"], ['html'], {
              'current': req.irisRoute.options,
              'tree': tree,
            }, req.authPass, req).then(function (success) {
  
              res.send(success);
  
            }, function (fail) {
  
              iris.modules.frontend.globals.displayErrorPage(500, req, res);
  
              iris.log("error", fail);
  
            });
  
          }, function(fail) {
  
            iris.log("error", fail);
  
          });
  
  
      }
    }
  });

  
});

iris.route.get("/irisjs-editor/checkout-branch/:target", {}, function (req, res) {

  // Deploy changes to live.
  iris.modules.frontend.globals.parseTemplateFile(["chooseBranch"], null, {
    'current': req.irisRoute.options,
    'target' : req.params.target
  }, req.authPass, req).then(function (success) {

    res.send(success);

  }, function (fail) {

    iris.modules.frontend.globals.displayErrorPage(500, req, res);

    iris.log("error", fail);

  });

});

iris.route.get("/irisjs-editor/checkout-branch", {}, function (req, res) {

  var branch = req.query.branch;

  iris.modules.irisjsEditor.globals.checkoutBranch(branch, req, function (success, msg) {

    iris.message(req.authPass.userid, msg, 'info');

    res.redirect('/irisjs-editor/editor');

  });

});

iris.modules.irisjsEditor.globals.checkoutBranch = function (params, req, callback) {

  if (params.target && params.target == 'live') {

    iris.modules.irisjsEditor.globals.executeCheckoutBranch(iris.sitePath, params, callback);

  }
  else {
    var userQuery = {
      entities: ['user'],
        queries: [{
          field: 'eid',
          operator: 'IS',
          value: req.authPass.userid
        }]
    };
                     
    iris.invokeHook("hook_entity_fetch", "root", null, userQuery).then(function (docs) {
      if (docs.length == 0 || !docs[0].git || !docs[0].git[0].gitpath) {

        callback(false, 'no gitpath');

      }
      else {

        iris.modules.irisjsEditor.globals.executeCheckoutBranch(docs[0].git[0].gitpath, params, callback);

      }
    });
    
  }
}

iris.modules.irisjsEditor.globals.executeCheckoutBranch = function (path, params, callback) {

  nodegit.Repository.open(path).then(function (repo) {

    return repo.getCurrentBranch().then(function (ref) {

      var checkoutOpts = {
        checkoutStrategy: nodegit.Checkout.STRATEGY.FORCE
      };

      if (params.branches.indexOf('/') > 0) {

        var parts = params.branches.split('/');
        return repo.getReference(params.branches)
          .then(function (ref) {

            repo.getBranchCommit(ref.shorthand()).then(function (commit) {

              nodegit.Branch.create(repo, parts[1], commit, 0).then(function (reference) {

                return repo.checkoutBranch(reference, checkoutOpts);

              });

            }, function(fail) {

              var p =3;

            });
          });
      }
      else {

        return repo.checkoutBranch(params.branches, checkoutOpts);

      }

    }).then(function () {

      return repo.getCurrentBranch().then(function (ref) {

        callback(true, "On " + ref.shorthand() + " " + ref.target(), params.target);

      });

    });

  }).catch(function (err) {

    callback(false, err, params.target);

  });

}

iris.route.get("/irisjs-editor/create-branch", {}, function (req, res) {

  iris.modules.frontend.globals.parseTemplateFile(["createBranch"], null, {}, req.authPass, req).then(function (success) {

    res.send(success);

  });

});

iris.route.get("/irisjs-editor/commit-changes", {}, function (req, res) {

  iris.modules.frontend.globals.parseTemplateFile(["commitChanges"], null, {}, req.authPass, req).then(function (success) {

    res.send(success);

  });

});

iris.route.get("/irisjs-editor/push", {}, function (req, res) {

  iris.modules.frontend.globals.parseTemplateFile(["push"], null, {}, req.authPass, req).then(function (success) {

    res.send(success);

  });

});

iris.route.get("/irisjs-editor/clone", {}, function (req, res) {

  var path = iris.sitePath;

  iris.modules.irisjsEditor.globals.cloneRepo(path, req, function (success, msg) {

    iris.message(req.authPass.userid, msg, 'info');
    res.redirect('/irisjs-editor/editor');

  });

});

iris.route.get("/get-file", {}, function (req, res) {

  var file = fs.readFileSync(iris.sitePath + req.query.path, "utf8");
  res.send(file);

});

/**
 * Goes through the given directory to return all files and folders recursively
 * @author Ash Blue ash@blueashes.com
 * @example getFilesRecursive('./folder/sub-folder');
 * @requires Must include the file system module native to NodeJS, ex. var fs = require('fs');
 * @param {string} folder Folder location to search through
 * @returns {object} Nested tree of the found files
 */
// var fs = require('fs');
iris.modules.irisjsEditor.globals.getFilesRecursive = function(folder, repo, root) {

  var fileContents = fs.readdirSync(folder),
    fileTree = [],
    stats;

  fileContents.forEach(function (fileName) {

    if (fileName == '.git') {
      return;
    }
    stats = fs.lstatSync(folder + '/' + fileName);

    if (stats.isDirectory()) {

      fileTree.push({
        text: fileName,
        type: 'folder',
        children: iris.modules.irisjsEditor.globals.getFilesRecursive(folder + '/' + fileName, repo, root)
      });
    }
    else {
      var path = folder.replace(root, '') + '/' + fileName;
      if (path.indexOf('/') === 0) {
        path = path.substring(1);
      }
      var status = nodegit.Status.file(repo, path);
      var leaf = {
        type: 'file',
        id: folder + '/' + fileName,
        text: fileName
      };

      if (status > 0) {
        var pi = 3;
      }
      if (status == 256) {
        leaf.a_attr = {
          'class': "modified"
        };
      }
      ;

      fileTree.push(leaf);

    }
  });

  return fileTree;
};

iris.modules.irisjsEditor.globals.getFilesRecursiveFlat = function(folder, repo, root, fileList) {

  var fileContents = fs.readdirSync(folder),
    fileTree = [],
    stats;

  fileContents.forEach(function (fileName) {

    if (fileName == '.git') {
      return;
    }
    stats = fs.lstatSync(folder + '/' + fileName);

    if (stats.isDirectory()) {

      iris.modules.irisjsEditor.globals.getFilesRecursiveFlat(folder + '/' + fileName, repo, root, fileList);

    }
    else {
      var path = folder.replace(root, '') + '/' + fileName;
      if (path.indexOf('/') === 0) {
        path = path.substring(1);
      }

      var status = nodegit.Status.file(repo, path);

      if (status == 256) {
        fileList.push(path);
      };

    }
  });

};

iris.modules.frontend.registerHook("hook_frontend_embed__currentBranch", 0, function (thisHook, data) {

    var userQuery = {
      entities: ['user'],
        queries: [{
          field: 'eid',
          operator: 'IS',
          value: thisHook.authPass.userid
        }]
    };
                     
    iris.invokeHook("hook_entity_fetch", "root", null, userQuery).then(function (docs) {
      
      if (docs.length == 0 || !docs[0].git || !docs[0].git[0].gitpath) {

        iris.message(thisHook.authPass.userid, "No git path available", "danger");
        thisHook.pass('');

      }
      else {

        iris.modules.irisjsEditor.globals.getCurrentBranch(docs[0].git[0].gitpath, thisHook, data);

      }
    });

});

iris.modules.irisjsEditor.globals.getCurrentBranch = function(path, thisHook, data) {

  nodegit.Repository.open(path).then(function (repo) {

    repo.getCurrentBranch().then(function (ref) {

      if (thisHook.context.embedID == 'full') {
        var branch = "Current branch: " + ref.shorthand() + ' ' + ref.target();
      }
      else {
        var branch = "Commit id: " + ref.target();
      }
      thisHook.pass(branch);

    }).catch(function (err) {

    iris.message(thisHook.authPass.userid, err, "danger");
    thisHook.pass('');

  });

  }).catch(function (err) {

    iris.message(thisHook.authPass.userid, err, "danger");
    thisHook.pass('');

  });

}


iris.modules.irisjsEditor.globals.cloneRepo = function (params, req, callback) {

    var url = params.url,
      local = "/tmp/" + req.authPass.userid + "-" + Date.now().toString(),
      cloneOpts = {
        checkoutBranch: 'master',
        fetchOpts: {
          callbacks: {
            credentials: function (url, userName) {
              return nodegit.Cred.userpassPlaintextNew(params.username, params.password);
            }
          }
        }
      };

    nodegit.Clone(url, local, cloneOpts).then(function (repo) {

      callback(true, repo.workdir());

    }).catch(function (err) {

      callback(false);
    });

}

iris.modules.irisjsEditor.globals.popupSubmit = function (errors, values) {

  $.ajax({
    type: "POST",
    contentType: "application/json",
    url: window.location,
    data: JSON.stringify(values),
    dataType: "json",
    success: function (data) {

      if (data.errors) {

        $("body").animate({
          scrollTop: $("[data-formid='" + values.formid + "'").offset().top
        }, "fast");

        var errorMessages = '';

        // As this may be a second submission attempt, clear all field errors.
        $('.form-control', $("[data-formid='" + values.formid + "'")).removeClass('error');

        for (var i = 0; i < data.errors.length; i++) {

          errorMessages += "<div class='alert alert-danger'>" + data.errors[i].message + "</div>";

          if (data.errors[i].field) {

            $("input[name=" + data.errors[i].field + ']').addClass('error');

          }

        }

        // If the form-errors div already exists, replace it, otherwise add to top of form.
        if ($('.form-errors', $("[data-formid='" + values.formid + "'")).length > 0) {

          $('.form-errors', $("[data-formid='" + values.formid + "'")).html(errorMessages);

        } else {

          $("[data-formid='" + values.formid + "'").prepend('<div class="form-errors">' + errorMessages + '</div>');

        }

      } else if (data.messages && data.messages.length > 0) {

        var messages = '';
        data.messages.forEach(function (obj) {

          messages += "<div class='alert alert-" + obj.type + "'>" + obj.message + "</div>";

        });

        // If the form-errors div already exists, replace it, otherwise add to top of form.
        if ($('.form-messages', $("[data-formid='" + values.formid + "'")).length > 0) {

          $('.form-messages', $("[data-formid='" + values.formid + "'")).html(messages);

        } else {

          $("[data-formid='" + values.formid + "'").html('<div class="form-messages">' + messages + '</div>');

        }

        setTimeout(function() {
          jQuery.colorbox.close();
          location.reload();
        },1000);


      } else if (data.redirect) {

        window.location.href = data.redirect;

      } else {

        if (data && data.indexOf("doctype") === -1) {

          window.location.href = data;

        } else {

          window.location.href = window.location.href;

        }

      }

    }
  });
};

process.on("dbReady", function(){
  
  if (iris.modules.irisjsEditor) {
    
    var schema = iris.entityTypes['user'];
    
    if (Object.keys(schema.fields).indexOf('git') <= 0) {

      schema.fields.git = {
        "description": "", //TODO: Add description to field
        "fieldType": "Fieldset",
        "label": "Git",
        "permissions": [],
        "unique": false,
        "subfields": {
          "gitpath": {
            "description": "Path to the respository of this git project",
            "fieldType": "Textfield",
            "label": "Git path",
            "machineName": "gitpath",
            "permissions": [],
            "required": false,
            "unique": false
          },
          "signature_email": {
            "description": "Email used for signing commits",
            "fieldType": "Textfield",
            "label": "Signture email",
            "machineName": "signature_email",
            "permissions": [],
            "required": false,
            "unique": false
          },
          "signature_name": {
            "description": "Username used for signing commits",
            "fieldType": "Textfield",
            "label": "Signature name",
            "machineName": "signature_name",
            "permissions": [],
            "required": false,
            "unique": false
          }
        }
      }

      // Save updated schema.
      iris.saveConfig(schema, "entity", 'user', function (data) {

       // iris.message(thisHook.authPass.userid, thisHook.authPass.t("Added git fields to user entity"), "success");
        
      });

    }
  }

});
