/*!
* Aloha Editor
* Author & Copyright (c) 2010 Gentics Software GmbH
* aloha-sales@gentics.com
* Licensed unter the terms of http://www.aloha-editor.com/license.html
*/

define([
  "aloha",
  "aloha/plugin",
  "aloha/jquery",
  "ui/component",
  "ui/surface",
	"ui/toggleCommandButton",
	"ui/multiSplit",
  "i18n!format/nls/i18n",
  "i18n!aloha/nls/i18n",
  'aloha/console',
  'css!format/css/format.css'
],
function(Aloha, Plugin, jQuery, Component, Surface, ToggleCommandButton, MultiSplit, i18n, i18nCore) {
	"use strict";
	var
		GENTICS = window.GENTICS;

	/**
	 * register the plugin with unique name
	 */
	return Plugin.create('format', {
		/**
		 * Configure the available languages
		 */
		languages: ['en', 'de', 'fr', 'eo', 'fi', 'ru', 'it', 'pl'],

		/**
		 * default inline formatting buttons
		 */
     inlineFormattingButtons: [ "bold", "italic", "strikethrough", "subscript", "superscript", "underline" ],

    /**
		 * default block formatting options 
		 */
    formatBlockButtons: [ "p", "h1", "h2", "h3", "h4", "h5", "h6", "pre" ],

    /**
		 * set the default formats according to the removeformat command 
		 */
		formatsToRemove: ["abbr", "acronym", "b", "bdi", "bdo", "big", "blink", "cite", "code", "dfn", "em", "font", "i", "ins", "kbd", "mark", "nobr", "q", "s", "samp", "small", "span", "strike", "strong", "sub", "sup", "tt", "u", "var"],

		/**
		 * Initialize the plugin and set initialize flag on true
		 */
		init: function () {
			// Prepare
			var that = this;

      //init inline formatting buttons
			that.initInlineFormattingButtons();

      // initialize formatting block
      that.initFormatBlock();
		},

    /**
      * Add inline formatting buttons
		  */
		initInlineFormattingButtons: function () {
			var that = this;

      // The bold component is a [toggleCommandButton](toggleCommandButton.html) that ties into the bold command.
      // The button will automatically update its state whenever the selection changes
      // and it will apply or remove the bold styling when the button is clicked.
      // This functionality comes from the toggleButton which knows how to hook into
      // the associated command.
			jQuery.each(that.inlineFormattingButtons, function( i, command ) {
        Component.define( command, ToggleCommandButton, {
          command: command,
          label: i18n.t( "button." + command + ".label" ),
          iconOnly: true,
          icon: "aloha-icon aloha-icon-" + command
        });
      });
    },

    initFormatBlock: function(){
      var that = this;

      /**
       * Format block component
       * @class
       * @extends {MultiSplit}
       */
      var FormatBlock = Component.define( "formatBlock", MultiSplit, {
        /**
         * Gets the buttons for the multi split menu
         * @returns {Array.<Object>}
         */
        getButtons: function() {
          // TODO: Finalize on how the settings should be given
          return jQuery.map( that.formatBlockButtons, function( item ) {
            return FormatBlock._buttons[ item ];
          });
        },

        /**
         * Gets the items for bottom of the multi split menu
         * @returns {Array.<Object>}
         */
        getItems: function() {
          var formatBlock = this;
          return [{
            label: i18n.t( "button.removeFormatting.label" ),
            click: function() {
              that.removeFormatting( Surface.range, this.editable );
            }
          }];
        }
      });

      /**
       * Settings for all format block buttons
       * @type {Array.<Object>}
       */
      FormatBlock._buttons = {};
      jQuery.each(that.formatBlockButtons, function( i, block ) {
        FormatBlock._buttons[ block ] = {
          label: i18n.t( "button." + block + ".label" ),
          icon: "aloha-large-icon-" + block,
          click: function() {
            Aloha.execCommand( "formatBlock", false, block, Surface.range );
          },
          isActive: function() {
            return Aloha.queryCommandValue( "formatBlock" ) === block;
          }
        };
      });
    },

		/**
		 * Removes all formatting from the current selection.
		 */
		removeFormatting: function(range) {
      // set the default formats according to the removeformat command.
      var formats = ["abbr", "acronym", "b", "bdi", "bdo", "big", "blink", "cite", "code", "dfn", "em", "font", "i", "ins", "kbd", "mark", "nobr", "q", "s", "samp", "small", "span", "strike", "strong", "sub", "sup", "tt", "u", "var"],
          rangeObject = new GENTICS.Utils.RangeObject( range || Aloha.getSelection().getRangeAt( 0 ) );
			
      // TODO: Finalize on how to pass the settings to the plugin
			// formats to be removed by the removeFormat button may now be configured using Aloha.settings.plugins.format.removeFormats = ['b', 'strong', ...]
			//if (this.settings.removeFormats) {
		  //		formats = this.settings.removeFormats;
			//}

			if (rangeObject.isCollapsed()) {
				return;
			}

      // run removeformat command on the selected range
      // TODO: check the difference between range and rangeObject
      Aloha.execCommand("removeformat", false, formats, range);

			// select the modified range
			rangeObject.select();

			// TODO: trigger event - removed Format
		},

		/**
		* toString method
		* @return string
		*/
		toString: function () {
			return 'format';
		}
	});
});
