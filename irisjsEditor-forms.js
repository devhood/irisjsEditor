var nodegit = require('nodegit');
var fs = require('fs');

iris.modules.irisjsEditor.registerHook("hook_form_render__codeEditor", 0, function (thisHook, data) {

  var path = thisHook.context.context.req.query.path;

  if (path) {

    var file = fs.readFileSync(path, "utf8");

    var lastDot = path.lastIndexOf('.');
    var fileType = path.substring(lastDot + 1, path.length).toLowerCase();

    var mode = 'javascript';

    if (fileType == 'md') {
      mode = 'markdown';
    }
    else if (fileType != 'js') {
      mode = fileType;
    }

    data.schema.fileType = {
      "type": "hidden",
      "default": mode,
    };

    data.schema.path = {
      "type": "hidden",
      "default": path,
    };

    data.schema.code = {
      type: "string",
      "default": file ? file : ''
    };

    data.form = [
      {
        "key": "code",
        "type": "ace",
        "aceMode": mode,
        "aceTheme": "twilight",
        "width": "100%",
        "height": "calc(100% - 50px)"
      },
      "path",
      "fileType",
      {
        "type": "submit",
        "value": "Save file"
      }
    ];
  }
  else {

    data.schema.empty = {
      "type" : "markup",
      "markup": "<h3><-- Select a file from the directory to edit</h3>"
    };

  }

  thisHook.pass(data);

});

iris.modules.irisjsEditor.registerHook("hook_form_submit__codeEditor", 0, function (thisHook, data) {

  if (thisHook.context.params.fileType == 'json') {
    thisHook.context.params.code = JSON.stringify(thisHook.context.params.code);
  }

  fs.writeFile(thisHook.context.params.path, thisHook.context.params.code, function (err) {
    if (err) {
      return console.log(err);
    }

    console.log("The file was saved!");
  });

  thisHook.pass(data);

});


iris.modules.irisjsEditor.registerHook("hook_form_render__createBranch", 0, function (thisHook, data) {

  data.schema.name = {
    "type": "string",
    "title": "Name"
  };

  data.onSubmit = iris.modules.irisjsEditor.globals.popupSubmit;

  thisHook.pass(data);

});

iris.modules.irisjsEditor.registerHook("hook_form_submit__createBranch", 0, function (thisHook, data) {

    var userQuery = {
      entities: ['user'],
        queries: [{
          field: 'eid',
          operator: 'IS',
          value: thisHook.authPass.userid
        }]
    };
          
    iris.invokeHook("hook_entity_fetch", "root", null, userQuery).then(function (docs) {
      if (docs.length == 0 || !docs[0].git[0] || !docs[0].git[0].gitpath) {
  
        data.errors.push({
          "message" : "No git path available"
        });
        thisHook.pass(data);
  
      }
      else {
  
        nodegit.Repository.open(docs[0].git[0].gitpath).then(function (repo) {
  
          repo.getCurrentBranch().then(function (ref) {
  
            repo.getBranchCommit(ref.shorthand()).then(function (commit) {
  
              nodegit.Branch.create(repo, thisHook.context.params.name, commit, 0).then(function (reference) {
  
                data.messages.push({
                  "message": "Branch created"
                });
                thisHook.pass(data);
  
              });
  
            });
  
          });
  
        }).catch(function (err) {
  
          data.errors.push({
            "message" : "Error creating branch"
          });
          thisHook.pass(data);
  
        });
      }
    });

});

iris.modules.irisjsEditor.registerHook("hook_form_render__chooseBranch", 0, function (thisHook, data) {

  if (thisHook.context.params.target == 'live') {

    iris.modules.irisjsEditor.globals.chooseBranchForm(iris.sitePath, thisHook, data);

  }
  else {

    var userQuery = {
      entities: ['user'],
        queries: [{
          field: 'eid',
          operator: 'IS',
          value: thisHook.authPass.userid
        }]
    };
          
    iris.invokeHook("hook_entity_fetch", "root", null, userQuery).then(function (docs) {
      if (docs.length == 0 || !docs[0].git[0] || !docs[0].git[0].gitpath ) {

        iris.message(thisHook.authPass.userid, "danger");
        thisHook.fail(data);

      }
      else {

        iris.modules.irisjsEditor.globals.chooseBranchForm(docs[0].git[0].gitpath, thisHook, data);

      }
    });

  }

});


iris.modules.irisjsEditor.globals.chooseBranchForm = function(path, thisHook, data) {

  nodegit.Repository.open(path).then(function (repo) {

    repo.getCurrentBranch().then(function (ref) {

      var branch = ref.shorthand();

      repo.getReferenceNames(nodegit.Reference.TYPE.LISTALL).then(function(branches) {

        var list = [];

        branches.forEach(function(branch) {

          var parts = branch.split('/');
          if (parts[1] == 'remotes' && list.indexOf(parts[parts.length - 1]) < 0) {
            branch = parts[parts.length - 2] + '/' + parts[parts.length - 1];
          }
          else {
            branch = parts[parts.length - 1];
          }
          if (list.indexOf(branch) < 0 && parts[parts.length - 1] != 'HEAD') {

            list.push(branch);

          }

        });

        data.schema.branches = {
          "type": "string",
          "title": "Current branch",
          "enum": list,
          "default": branch
        };

        data.schema.target = {
          "type" : "hidden",
          "default" : thisHook.context.params.target
        };

        if (thisHook.context.params.target && thisHook.context.params.target == 'dev') {
          data.form = [
            {
              "key": "branches",
              "onChange": function (e) {
                $(e.target).parents('form').submit();
              }
            },
            "target"
          ];
        }
        else {
          data.onSubmit = iris.modules.irisjsEditor.globals.popupSubmit;
        }

        thisHook.pass(data);

      });

    });

  }).catch(function (err) {

    iris.message(thisHook.authPass.userid, err, "danger");
    thisHook.fail(data);

  });

}

iris.modules.irisjsEditor.registerHook("hook_form_submit__chooseBranch", 0, function (thisHook, data) {

  iris.modules.irisjsEditor.globals.checkoutBranch(thisHook.context.params, thisHook.context.req, function (success, msg, target) {

    if (target != 'live') {
      data.callback = '/irisjs-editor/editor';
    }
    thisHook.pass(data);

  });

});

iris.modules.irisjsEditor.globals.cloneForm = function(data, remote) {

  var htmlencode = require('htmlencode');
  //htmlencode.htmlEncode('<h1>Welcome</h1>');

  var url = remote.url();

  data.schema.url = {
    "type": "hidden",
    "default": htmlencode.htmlEncode(url)
  };

  data.schema.username = {
    "type": "text",
    "title": "Git Username",
  };

  data.schema.password = {
    "type": "string",
    "title": "Git Password"
  };

  data.form = [
    "url",
    "username",
    {
      "key": "password",
      "type": "password"
    },
    {
      "type": "submit",
      "value": "Clone repo to edit"
    }
  ];

};

iris.modules.irisjsEditor.registerHook("hook_form_render__cloneRepo", 0, function (thisHook, data) {

  var path = iris.sitePath;

  var userQuery = {
    entities: ['user'],
      queries: [{
        field: 'eid',
        operator: 'IS',
        value: thisHook.authPass.userid
      }]
  };
        
  iris.invokeHook("hook_entity_fetch", "root", null, userQuery).then(function (docs) {
    
    nodegit.Repository.open(path).then(function (repo) {
      
      repo.getRemote('origin', function () {}).then(function (remote) {
        // Use remote


  
        iris.modules.irisjsEditor.globals.cloneForm(data, remote);

        if (docs.length == 0 || !docs[0].git[0] || !docs[0].git[0].signature_name || !docs[0].git[0].signature_email) {

              data.schema.sig_username = {
                "type" : "text",
                "title" : "Signature username"
              };
    
              data.schema.sig_email = {
                "type" : "text",
                "title" : "Signature email"
              };
    
              data.form.unshift('sig_email');
              data.form.unshift('sig_username');

        }

        thisHook.pass(data);

      });

    }).catch(function (err) {

      iris.log("error", err);

      thisHook.fail(data);

    });
  });

});

iris.modules.irisjsEditor.registerHook("hook_form_submit__cloneRepo", 0, function (thisHook, data) {

  var params = thisHook.context.params;

  iris.modules.irisjsEditor.globals.cloneRepo(params, thisHook.context.req, function (success, path) {

    if (success) {

      if (path[path.length -1] == '/') {
        path = path.slice(0, -1);
      }

      var update = {
        "entityType": "user",
        'eid': thisHook.authPass.userid,
      };
      
      var git = {};
      git.gitpath = path;

      if (params.sig_username) {
        git.signature_name = params.sig_username;
      }
      
      if (params.sig_email) {
        git.signature_email = params.sig_email;
      }
      update.git = [git];
      
      
      iris.invokeHook("hook_entity_edit", "root", null, update).then(function (docs) {
    
        iris.message(thisHook.authPass.userid, "Repo successfully cloned for editing.", "info");
          data.redirect = '/irisjs-editor/editor';
          thisHook.pass(data);
    
      }, function (fail) {
    
        data.errors.push({
            "messages" : "Unable to user data to include the path of your git clone"
          });

          thisHook.pass(data);
    
      });

    }
    else {
      data.errors.push({
        "message": "Error cloning repo",
      });
      thisHook.pass(data);
    }

  });

});


iris.modules.irisjsEditor.registerHook("hook_form_render__commitChanges", 0, function (thisHook, data) {

  data.schema.message = {
    "type": "text",
    "title": "Commit message"
  };

  data.onSubmit = iris.modules.irisjsEditor.globals.popupSubmit;

  thisHook.pass(data);

});

iris.modules.irisjsEditor.registerHook("hook_form_submit__commitChanges", 0, function (thisHook, data) {

  var userQuery = {
    entities: ['user'],
      queries: [{
        field: 'eid',
        operator: 'IS',
        value: thisHook.authPass.userid
      }]
  };
  iris.invokeHook("hook_entity_fetch", "root", null, userQuery).then(function (docs) {
    if (docs.length == 0 || !docs[0].git[0] || !docs[0].git[0].gitpath) {

      data.errors.push({
        "message" : "No git path available"
      });
      thisHook.pass(data);

    }
    else {

      var root = docs[0].git[0].gitpath;
      nodegit.Repository.open(root).then(function (repo) {

        var fileList = [];
        iris.modules.irisjsEditor.globals.getFilesRecursiveFlat(root, repo, root, fileList);
        var author = nodegit.Signature.now(docs[0].git[0].signature_name, docs[0].git[0].signature_email);
        repo.createCommitOnHead(fileList, author, author, thisHook.context.params.message).then(function(oid) {

          data.messages.push({
            "message" : "Successfully commited"
          });

          thisHook.pass(data);

        });
      }).catch(function (err) {

        data.errors.push({
          "message" : err.message
        });

        thisHook.pass(data);

      });
    }
  });

});

iris.modules.irisjsEditor.registerHook("hook_form_render__merge", 0, function (thisHook, data) {

  if (thisHook.context.params.target == 'live') {

    iris.modules.irisjsEditor.globals.getMergeOptions(iris.sitePath, thisHook, data);

  }
  else {

      var userQuery = {
        entities: ['user'],
          queries: [{
            field: 'eid',
            operator: 'IS',
            value: thisHook.authPass.userid
          }]
      };
      iris.invokeHook("hook_entity_fetch", "root", null, userQuery).then(function (docs) {
        if (docs.length == 0 || !docs[0].git[0] || !docs[0].git[0].gitpath) {

          iris.message(thisHook.authPass.userid, "danger");
          thisHook.fail(data);

        }
        else {
  
          iris.modules.irisjsEditor.globals.getMergeOptions(docs[0].git[0].gitpath, thisHook, data);
  
        }

    });

  }

});

iris.modules.irisjsEditor.globals.getMergeOptions = function(path, thisHook, data) {

  nodegit.Repository.open(path).then(function (repo) {

    repo.getCurrentBranch().then(function (ref) {

      var branch = ref.shorthand();

      repo.getReferenceNames(nodegit.Reference.TYPE.LISTALL).then(function (branches) {

        var list = [];

        branches.forEach(function (branch) {

          var parts = branch.split('/');
          if (parts[1] == 'remotes' && list.indexOf(parts[parts.length - 1]) < 0) {
            branch = parts[parts.length - 2] + '/' + parts[parts.length - 1];
          }
          else {
            branch = parts[parts.length - 1];
          }
          if (list.indexOf(branch) < 0 && parts[parts.length - 1] != 'HEAD') {

            list.push(branch);

          }

        });

        data.schema.from = {
          "type" : "text",
          "title" : "From",
          "enum" : list
        };

        data.schema.to = {
          "type": "text",
          "title": "Branch",
          "enum" : list
        };

        data.onSubmit = iris.modules.irisjsEditor.globals.popupSubmit;
        thisHook.pass(data);

      });

    });

  });



}

iris.modules.irisjsEditor.registerHook("hook_form_submit__merge", 0, function (thisHook, data) {

  var userQuery = {
    entities: ['user'],
    queries: [{
      field: 'eid',
      operator: 'IS',
      value: thisHook.authPass.userid
    }]
  };
  iris.invokeHook("hook_entity_fetch", "root", null, userQuery).then(function (docs) {
    if (docs.length == 0 || !docs[0].git[0] || !docs[0].git[0].gitpath) {

      data.errors.push({
        "message": "No git path available"
      });
      thisHook.pass(data);

    }
    else {

      nodegit.Repository.open(docs[0].git[0].gitpath).then(function (repo) {

        repo.mergeBranches(thisHook.context.params.to, thisHook.context.params.from).then(function(oid) {

          var p = 3;

        }, function(fail) {

          var p = 3;

        });

      });
    }
  });

  thisHook.pass(data);

});


iris.modules.irisjsEditor.registerHook("hook_form_render__fetchAll", 0, function (thisHook, data) {

  data.schema.username = {
    "type" : "text",
    "title" : "Git username"
  };

  data.schema.password = {
    "type" : "text",
    "title" : "Git password"
  };

  data.schema.target = {
    "type": "hidden",
    "default" : thisHook.context.params.target
  };

  data.form = [
    'username',
    {
      "key": "password",
      "type": "password"
    },
    "target",
    {
      "type" : "submit",
      "value" : "Fetch"
    }
  ];

  data.onSubmit = iris.modules.irisjsEditor.globals.popupSubmit;

  thisHook.pass(data);

});


iris.modules.irisjsEditor.registerHook("hook_form_submit__fetchAll", 0, function (thisHook, data) {

  if (thisHook.context.params.target == 'live') {

    iris.modules.irisjsEditor.globals.fetchAllForm(iris.sitePath, thisHook, data);

  }
  else {
    var userQuery = {
      entities: ['user'],
      queries: [{
        field: 'eid',
        operator: 'IS',
        value: thisHook.authPass.userid
      }]
    };
    iris.invokeHook("hook_entity_fetch", "root", null, userQuery).then(function (docs) {
      if (docs.length == 0 || !docs[0].git[0] || !docs[0].git[0].gitpath) {

      }
      else {

        iris.modules.irisjsEditor.globals.fetchAllForm(docs[0].git[0].gitpath, thisHook, data);

      }
    });
  }

});

iris.modules.irisjsEditor.globals.fetchAllForm = function(path, thisHook, data) {

  nodegit.Repository.open(path)
    .then(function (repo) {

      return repo.fetchAll({
        callbacks: {
          credentials: function (url, userName) {
            return nodegit.Cred.userpassPlaintextNew(thisHook.context.params.username, thisHook.context.params.password);
          }
        }
      }, true).then(function (success) {

        iris.message(thisHook.authPass.userid, "Successfully fetched", "info");
        data.messages.push({
          "message" : "Success"
        });
        thisHook.pass(data);

      }, function (fail) {

        iris.message(thisHook.authPass.userid, "Failed fetching: " + fail, "info");
        data.errors.push({
          "message" : "Failed"
        });
        thisHook.pass(data);

      });

    });

};

iris.modules.irisjsEditor.registerHook("hook_form_render__push", 0, function (thisHook, data) {

  data.schema.remote = {
    "type": "text",
    "title": "Remote"
  };

  data.schema.branch = {
    "type": "text",
    "title": "Branch"
  };

  data.schema.username = {
    "type" : "text",
    "title" : "Username"
  };

  data.schema.password = {
    "type" : "text",
    "title" : "Password"
  };

  data.form = [
    "remote",
    "branch",
    "username",
    {
      "key" : "password",
      "type" : "password"
    },
    {
      "type" : "submit",
      "value" : "Push"
    }
  ];

  data.onSubmit = iris.modules.irisjsEditor.globals.popupSubmit;

  thisHook.pass(data);

});

iris.modules.irisjsEditor.registerHook("hook_form_submit__push", 0, function (thisHook, data) {

    var userQuery = {
      entities: ['user'],
      queries: [{
        field: 'eid',
        operator: 'IS',
        value: thisHook.authPass.userid
      }]
    };
    iris.invokeHook("hook_entity_fetch", "root", null, userQuery).then(function (docs) {
      if (docs.length == 0 || !docs[0].git[0] || !docs[0].git[0].gitpath) {

      data.errors.push({
        "message" : "No git path available"
      });

      thisHook.pass(data);

    }
    else {

      var root = docs[0].git[0].gitpath;

      nodegit.Repository.open(root).then(function (repo) {

        nodegit.Remote.lookup(repo, thisHook.context.params.remote, function(){}).then(function (remote) {

          return result = remote.push(
            ["refs/heads/" + thisHook.context.params.branch + ":refs/heads/" + thisHook.context.params.branch],
            {
              callbacks: {
                credentials: function (url, userName) {
                  return nodegit.Cred.userpassPlaintextNew(thisHook.context.params.username, thisHook.context.params.password);
                }
              }
            }
          ).then(function(pass) {

            data.messages.push({
              "message" : "Successfully pushed changes"
            });

            thisHook.pass(data);

          }).catch(function(err) {

            data.errors.push({
              "message" : err
            });

            thisHook.pass(data);

          });

        });
      });
    }
  });


});

iris.modules.irisjsEditor.registerHook("hook_form_render__irisjsDeploy", 0, function (thisHook, data) {

  data.schema.remote = {
    "type" : "text",
    "title": "Remote"
  };

  data.schema.branch = {
    "type" : "text",
    "title": "Branch"
  };

  data.schema.username = {
    "type" : "text",
    "title": "Username"
  };

  data.schema.password = {
    "type" : "text",
    "title": "Password"
  };

  data.form = [
    "remote",
    "branch",
    "username",
    {
      "key" : "password",
      "type" : "password"
    },
    {
      "type": "submit",
      "value" : "Pull"
    }
  ];

  thisHook.pass(data);

});

iris.modules.irisjsEditor.registerHook("hook_form_submit__irisjsDeploy", 0, function (thisHook, data) {

  var repository;
  var path = iris.sitePath;
  // Open a repository that needs to be fetched and fast-forwarded
  nodegit.Repository.open(path)
    .then(function(repo) {

      repository = repo;
      return repository.fetchAll({
        callbacks: {
          credentials: function (url, userName) {
            return nodegit.Cred.userpassPlaintextNew(thisHook.context.params.username, thisHook.context.params.password);
          }
        }
      }, true).then(function(success) {
        var p = 3;
      }, function(fail) {
        var p = 3;
      });
    }, function(fail) {

      iris.log("error", fail);

    })
    // Now that we're finished fetching, go ahead and merge our local branch
    // with the new one
    .then(function() {
      repository.mergeBranches(thisHook.context.params.branch, thisHook.context.params.remote + "/" + thisHook.context.params.branch);
    }, function(fail) {

      iris.log("error", fail);

    })
    .done(function() {
      data.messages.push({
        "message" : "Fetched and merged " + thisHook.context.params.remote + "/" + thisHook.context.params.branch + " into " +thisHook.context.params.branch,
        "type" : "info"
      });
      thisHook.pass(data);
    });

});

iris.modules.irisjsEditor.registerHook("hook_form_render__empty", 0, function (thisHook, data) {

  data.schema.empty = {
    "type" : "hidden",
    "default": ""
  };

  data.form = ["empty"];

  thisHook.pass(data);

});