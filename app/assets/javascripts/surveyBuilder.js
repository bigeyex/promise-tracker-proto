$(document).ready(function() {

  // $(document).on("focus", ".replace-text, .options input", function(){
  //   $(this).on("mouseup.a keyup.a", function(e){      
  //     $(this).off("mouseup.a keyup.a").select();
  //   });
  // });
});

var PT = PT || {};

/// Input type defaults
PT.defaultControls = {
  inputText: {
    label: "Text",
    input_type: "string"
  },

  inputNumber: {
    label: "Number",
    input_type: "number"
  },

  inputDate: {
    label: "Date",
    input_type: "date"
  },

  inputLocation: {
    label: "Location",
    input_type: "geopoint"
  },

  inputImage: {
    label: "Image",
    input_type: "image",
  },

  inputSelectMany: {
    label: "Select one",
    input_type: "select1"
  },

  inputSelectOne: {
    label: "Select many",
    input_type: "select"
  }
};

/// Input constructor
PT.Input = function(){
  var self = this;

  self.id = ko.observable("");
  self.survey_id = PT.survey.id;
  self.label = ko.observable("");
  self.input_type = ko.observable();
  self.required = ko.observable(false);
  self.options = ko.observableArray([PT.flash.option_1]);
  self.order = "";
  self.inEdit = ko.observable(true);

  self.validate = function(){
    var inputEl = $("#input" + self.id());
    var messages = inputEl.find(".messages");
    messages.empty();

    if(!self.label()) {
      messages.append(PT.validations.question_blank);
      inputEl.addClass('invalid');
    } else if(self.input_type() == "select" || self.input_type() == "select1"){
      if (self.options().length == 0){
        messages.append(PT.validations.no_options);
        inputEl.addClass('invalid');
      } else {
      inputEl.removeClass('invalid');
      }
    } else {
      inputEl.removeClass('invalid');
    } 
  };

  self.save = function(self, event){
    $.ajax({
      url: "/surveys/" + PT.survey.id + "/inputs",
      type: "POST",
      contentType: "application/json",
      dataType: "json",
      data: ko.toJSON(self)
    })
    .done(function(response) {
      console.log(response);
      self.inEdit(false);

      if(self.id() === ""){
        self.id(response.id);
      }
      self.validate();
      PT.checkErrors();
    });
  };

  self.map = function(data){
    self.id = ko.observable(data.id);
    self.survey_id = data.survey_id;
    self.label = ko.observable(data.label);
    self.input_type = ko.observable(data.input_type);
    self.required = ko.observable(data.required);
    self.options = ko.observableArray(data.options);
    self.order = data.order;
    self.inEdit = ko.observable(false);
  }; 

  self.edit = function(){
    PT.survey.saveInputs();
    self.inEdit(true);
    PT.selectedInput(self);
  };

  self.addOption = function(input, event){
    self.options.push("");
    $(event.target).parents().find(".options").find(".option").last().find("input").focus();
  };

  self.deleteOption = function(option, event){
    self.options.remove(option);
  };

  self.copy = function(input, event) {
    $.ajax({
      url: Routes.clone_input_path(self.id()),
      type: 'GET',
      dataType: 'json',
      data: {param1: 'value1'},
    })
    .done(function(response) {
      var newInput = new PT.Input();
      newInput.map(response);
      PT.survey.inputs.push(newInput);
    });
  };

  self.applyType = function(){
    if(self.input_type() == "yes_no"){
      self.options([PT.flash.yes_no.option_yes, PT.flash.yes_no.option_no]);
      self.input_type("select1");
    }
  };
};


/// Survey Constructor
PT.SurveyModel = function(){
  var self = this;

  self.id = "";
  self.title = ko.observable();
  self.campaign_id = "";
  self.inputs = ko.observableArray([]);

  self.addInput = function(event){
    event.stopPropagation();
    self.saveInputs();

    var input = new PT.Input();
    var type = PT.defaultControls[$(event.currentTarget).attr("rel")];
    var index;
    
    if(type){
      input.input_type(type["input_type"]);
    }

    if($(event.target).hasClass("drag-insert")){
      index = $(event.target).index();
      $(event.target).remove();
    } else {
      index = self.inputs().length;
    }

    self.inputs.splice(index, 0, input);
    PT.selectedInput(input);
  };

  self.saveInputs = function(){
    var unsaved = self.inputs().filter(function(input) { return input.inEdit() === true ;});
    unsaved.forEach(function(input){input.save(input); });
  };

  self.removeInput = function(){
    var confirmed = window.confirm("Are you sure you want to delete this question?");
    if(confirmed){
      self.inputs.remove(this);
      if(this.id()){
        $.ajax({
          url: "/surveys/" + PT.survey.id + "/inputs/" + this.id(),
          type: "DELETE",
          contentType: "application/json",
          dataType: "json"
        })
        .done(function(response){
          console.log(response);
        }); 
      }
    } 

    self.inputs().length < 1 ? PT.selectedInput("") : false;
  };

  self.addStarterQuestion = function(){
    var input = new PT.Input();
    input.label(PT.flash.first_question);
    input.inEdit(true);
    input.input_type("string");
    input.survey_id = PT.survey.id;

    self.inputs.push(input);
    PT.selectedInput(self.inputs()[0]);
  };

  /// Update order of all inputs
  self.saveOrder = function(){
    self.saveInputs();
    // Hack
    window.location.pathname = Routes.campaign_path(PT.survey.campaign_id);
    
    $.ajax({
      url: "/surveys/" + PT.survey.id,
      type: "PUT",
      contentType: "application/json",
      dataType: "json",
      data: ko.toJSON(self)
    });

  };

  self.populateInputs = function(data){
    data.forEach(function(input){
      var newInput = new PT.Input();
      newInput.map(input);
      self.inputs.push(newInput);
    });

    self.inputs.sort(function(a,b){return a.order - b.order;});
    PT.selectedInput = ko.observable(self.inputs()[0]);
  };
};

PT.getSurvey = function(url){
  $.getJSON(url, null, function(response, textStatus) {
    PT.survey = new PT.SurveyModel();

    PT.survey.id = response.id;
    PT.survey.campaign_id = response.campaign_id;
    PT.survey.populateInputs(response.inputs);
    ko.applyBindings(PT.survey);

    PT.survey.inputs().forEach(function(input){
      input.validate();
    });
    PT.checkErrors();

    $(document).on("click", ".tool-button", PT.survey.addInput);
  });
};

PT.flashMessage = function(message, element){
  $("#message").remove();
  element.after(HandlebarsTemplates["flash_message"]({text: message})).fadeIn();
  $("#message").delay(2000).fadeOut();
};

PT.checkErrors = function(){
  if($("#survey-body").find(".invalid").length > 0){
    $("#error-check").addClass("alert-danger");
    $("#error-check p").html(PT.validations.has_errors);
  } else {
    $("#error-check").removeClass("alert-danger");
    $("#error-check p").html(PT.validations.no_errors);
  }
};
