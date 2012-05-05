- Changed the way the Aloha.getAlohaUrl() determines the URL leading up to the aloha.js script include.
- To fix an asynchronous loading problem, jquery plugins loaded with the
  jquery-plugin! requirejs extension are now always loaded synchronously.
