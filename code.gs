//main function to initially create script
function buildCard() {
  var searchSection = getSearchBox();
  
  var cardBuilder = CardService.newCardBuilder();
  cardBuilder.setHeader(CardService.newCardHeader()
        .setTitle('連絡先'));
  
  cardBuilder.addSection(searchSection);
  
  var card = cardBuilder.build();
  
  return [card];
}

//returns the search UI component
// with a search fild and a submit button
function getSearchBox(){
  var searchAction = CardService.newAction()
     .setFunctionName("onContactSearched");
  var searchSuggestions = getContactSuggestions();
  //text inputs only allow 30 suggestions ;(
  var textInput = CardService.newTextInput()
     .setFieldName("search")
     .setHint("🔍連絡先を検索してください")
     .setOnChangeAction(searchAction)
     .setSuggestions(searchSuggestions)
     ;
  var searchSection = CardService.newCardSection()
     .setHeader("Section header");
  searchSection.addWidget(textInput);
  
  //we need a separate button to open the new draft, 
  // since the text input doesn't have a composeAction setter
  var submitAction = CardService.newAction()
     .setFunctionName("onContactSubmitted");
  var button = CardService.newTextButton()
     .setComposeAction(submitAction, CardService.ComposedEmailType.STANDALONE_DRAFT)
     .setText("作成");
  searchSection.addWidget(button);
  
  return searchSection;
  
}

//global variables reset after every action,
// so save vaiables needed across different actions 
// (in this case search -> submit)
// in the user properties
function saveCurrentContactName(contactName){
  PropertiesService.getUserProperties().setProperty("currentContact", contactName);
}

function getCurrentContact(){
  //since we can only save strings in proprties,
  //we saved the name ->
  // retrieve the name and return the ssociated contact
  var name = PropertiesService.getUserProperties().getProperty("currentContact");
  var contacts = ContactsApp.getContactsByName(name);
  for (var i=0; i<contacts.length; i++){
    var contact = contacts[i];
    if (contact.getFullName() == name){
      return contact;
    }
  }
  return null;
}

function getContactSuggestions(){
  var contacts = ContactsApp.getContacts();
  var contactSuggestions = CardService.newSuggestions();
  for (var i=0; i<contacts.length; i++){
    var contact = contacts[i];
    var contactSuggestion  = "";
    var emails = contact.getEmails();
    if (emails == null || emails.length == 0){
      continue;
    }
    var name = contact.getFullName();
    if (name != null && name.length > 0){
      contactSuggestion += name;
      var companies = contact.getCompanies();
      if (companies != null && companies.length > 0){
        var companyName = companies[0].getCompanyName();
        if (companyName != null && companyName.length > 0){
          contactSuggestion += " | " + companyName;
        }
        var jobTitle = companies[0].getJobTitle();
        if (jobTitle != null && jobTitle.length > 0){
          contactSuggestion += " | " + jobTitle;
        }
      }     
    }
  }
  
  return contactSuggestions;
}

function onContactSearched(searchQuery) {
  var suggestion = searchQuery.formInput.search;
  var breakIndex = suggestion.indexOf(" | ");
  var name = suggestion;
  if (breakIndex != -1){
    name = suggestion.substring(0, breakIndex);
  }
  saveCurrentContactName(name);
  
}

function onContactSubmitted(query){
  var contact = getCurrentContact();
  if (contact == null){
    return null;
  }
  //need an access token to open messages
  var accessToken = query.messageMetadata.accessToken;
  GmailApp.setCurrentMessageAccessToken(accessToken);
  return openNewEmail(contact);
  
}

function formatEmailHeader(contact){
  var header = "";
  var companies = contact.getCompanies();
  if (companies != null && companies.length > 0){
    var companyName = companies[0].getCompanyName();
    if (companyName != null && companyName.length > 0){
      header += companyName + "\n";
    }
    var jobTitle = companies[0].getJobTitle();
    if (jobTitle != null && jobTitle.length > 0){
      header += jobTitle + "\n";
    }
  }
  var name = contact.getFullName();
  header += name + "様" + "\n";
  
  return header;
}

function openNewEmail(contact){
  var body = formatEmailHeader(contact);
  var emails = contact.getEmails();
  var email = emails[0].getAddress();
  var draft = GmailApp.createDraft(email, "", body);
  
  return CardService.newComposeActionResponseBuilder()
        .setGmailDraft(draft).build();
}
