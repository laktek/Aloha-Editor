/*!
 * Aloha Editor
 * Author & Copyright (c) 2010-2012 Gentics Software GmbH
 * aloha-sales@gentics.com
 * Licensed unter the terms of http://www.aloha-editor.com/license.html
 */

define([
	'aloha', 
	'aloha/jquery', 
	'aloha/plugin', 
	'ui/component',
	'ui/surface',
	'ui/button',
	'ui/toggleCommandButton',
	'i18n!list/nls/i18n', 
	'i18n!aloha/nls/i18n', 
], function( Aloha, jQuery, Plugin, Component, Surface, Button,
             ToggleCommandButton, i18n, i18nCore) {
	'use strict';

	/**
	 * Determines whether the current selection is inside a list
	 * @return {boolean}
	 *
	 * @private
	 */
	function inList() {
		return Aloha.queryCommandState( "insertorderedlist" ) ||
			Aloha.queryCommandState( "insertunorderedlist" );
	}

	/**
	 * Define the UI components needed by abbr plugin.
	 *
	 * @private
	 */
	function initUIComponents(){
		/**
		 * Ordered list component
		 * @class
		 * @extends {ToggleCommandButton}
		 */
		Component.define( "orderedList", ToggleCommandButton, {
			/**
			 * Localized label
			 * @type {string}
			 */
			label: i18n.t( "button.ol.label" ),

			/**
			 * Command to execute
			 * @type {string}
			 */
			command: "insertorderedlist",

			/**
			 * Whether or not to show only the icon
			 * @type {boolean}
			 */
			iconOnly: true,

			/**
			 * Which icon to render
			 * @type {string}
			 */
			icon: "aloha-icon aloha-icon-orderedlist"
		});

		/**
		 * Unordered list component
		 * @class
		 * @extends {ToggleCommandButton}
		 */
		Component.define( "unorderedList", ToggleCommandButton, {
			/**
			 * Localized label
			 * @type {string}
			 */
			label: i18n.t( "button.ul.label" ),

			/**
			 * Command to execute
			 * @type {string}
			 */
			command: "insertunorderedlist",

			/**
			 * Whether or not to show only the icon
			 * @type {boolean}
			 */
			iconOnly: true,

			/**
			 * Which icon to render
			 * @type {string}
			 */
			icon: "aloha-icon aloha-icon-unorderedlist"
		});

		/**
		 * Indent list component
		 * @class
		 * @extends {Button}
		 */
		Component.define( "indentList", Button, {
			/**
			 * Localized label
			 * @type {string}
			 */
			label: i18n.t( "button.indent.label" ),

			/**
			 * Whether or not to show only the icon
			 * @type {boolean}
			 */
			iconOnly: true,

			/**
			 * Which icon to render
			 * @type {string}
			 */
			icon: "aloha-icon aloha-icon-indent",

			/**
			 * Click callback
			 * @override
			 */
			click: function() {
				Aloha.execCommand( "indent", null, false, Surface.range );
			},

			/**
			 * Selection change callback
			 * @override
			 */
			selectionChange: function() {
				if ( inList() ) {
					this.show();
				} else {
					this.hide();
				}
			}
		});

		/**
		 * Outdent list component
		 * @class
		 * @extends {Button}
		 */
		Component.define( "outdentList", Button, {
			/**
			 * Localized label
			 * @type {string}
			 */
			label: i18n.t( "button.outdent.label" ),

			/**
			 * Whether or not to show only the icon
			 * @type {boolean}
			 */
			iconOnly: true,

			/**
			 * Which icon to render
			 * @type {string}
			 */
			icon: "aloha-icon aloha-icon-outdent",

			/**
			 * Click callback
			 * @override
			 */
			click: function() {
				Aloha.execCommand( "outdent", null, false, Surface.range );
			},

			/**
			 * Selection change callback
			 * @override
			 */
			selectionChange: function() {
				if ( inList() ) {
					this.show();
				} else {
					this.hide();
				}
			}
		});

	}

	/**
	 * Register the ListPlugin as Aloha.Plugin
	 */
	var ListPlugin = Plugin.create('list', {
		/**
		 * Configure the available languages
		 */
		languages: ['en', 'de', 'fr', 'eo', 'fi', 'ru', 'it'],

		/**
		 * default button configuration
		 */
		config: [ 'ul', 'ol' ],

		/**
		 * List of transformable elements
		 */
		transformableElements: {'p' : true, 'h1' : true, 'h2' : true, 'h3' : true, 'h4' : true, 'h5' : true, 'h6' : true, 'ul' : true, 'ol' : true},

		/**
		 * Initialize the plugin, register the buttons
		 */
		init: function() {
			var plugin = this;

			initUIComponents();

			// add the key handler for Tab
			Aloha.Markup.addKeyHandler(9, function(event) {
				return plugin.processTab(event);
			});
		},

			

		/**
		 * Process Tab and Shift-Tab pressed in lists
		 */
		processTab: function (event) {
			if ( inList() ) {
				Aloha.execCommand( event.shiftKey ? "outdent" : "indent" );
			}	
		}
	});

	/**
	 *
	 * TODO: These two functions are no longer called from the plugin.
	 * remove them if unnecessary. 
	 *
	 * A key handler that should be run as a keyup handler for the
	 * backspace and del keys. keyup fires after the browser has already
	 * performed the delete - this handler will perform a cleanup if
	 * necessary.
	 *
	 * Will work around an IE bug which breaks nested lists in the
	 * following situation, where [] is the selection, if backspace is
	 * pressed (same goes for the del key if the selection is at the end
	 * of the li that occurs before the selection):
	 *
	 * <ul>
	 *  <li>one</li>
	 *  <li><ul><li>two</li></ul></li>
	 * </ul>
	 * <p>[]</p>
	 *
	 * The browser behaviour, if one would presses backspace, results in
	 * the following:
	 *
	 * <ul>
	 *  <li>one</li>
	 *  <ul><li>two</li></ul>
	 * </ul>
	 *
	 * which is invalid HTML since the <ul>s are nested directly inside
	 * each other.
	 *
	 * Also, the following situation will cause the kind of invalid HTML
	 * as above.
	 * <ul>
	 *   <li>one</li>
	 *   <li><ul><li>two</li></ul></li>
	 *   <li>[]three</li>
	 * </ul>
	 *
	 * Also, the following situtation:
	 * <ul>
	 *   <li>one</li>
	 *   <li><ul><li>two</li></ul>
	 *       <p>[]three</p>
	 *       <li>four</li>
	 *   </li>
	 * </ul>
	 *
	 * And similar situations, some of which are not so easy to reproduce.
	 * 
	 * @param event a jQuery key event
	 * @return false if no action needed to be taken, true if cleanup has been performed
	 */
	function deleteWorkaroundHandler(event) {
		if (8/*backspace*/ != event.keyCode && 46/*del*/ != event.keyCode) {
			return false;
		}

		var rangeObj = Aloha.getSelection().getRangeAt(0);
		var startContainer = rangeObj.startContainer;

		//the hack is only relevant if after the deletion has been
		//performed we are inside a li of a nested list
		var $nestedList = jQuery(startContainer).closest('ul, ol');
		if ( ! $nestedList.length ) {
			return false;
		}
		var $parentList = $nestedList.parent().closest('ul, ol');
		if ( ! $parentList.length ) {
			return false;
		}

		var ranges = Aloha.getSelection().getAllRanges();

		var actionPerformed = false;
		$parentList.each(function(){
			actionPerformed = actionPerformed || fixListNesting(jQuery(this));
		});

		if (actionPerformed) {
			Aloha.getSelection().setRanges(ranges);
			for (var i = 0; i < ranges.length; i++) {
				ranges[i].detach();
			}
		}

		return actionPerformed;
	}

	/**
	 * If uls or ols are nested directly inside the given list (invalid
	 * HTML), they will be cleaned up by being appended to the preceding
	 * li.
	 */
	function fixListNesting($list) {
		var actionPerformed = false;
		$list.children('ul, ol').each(function(){
			Aloha.Log.debug("performing list-nesting cleanup");
			if ( ! jQuery(this).prev('li').append(this).length ) {
				//if there is no preceding li, create a new one and append to that
				jQuery(this).parent().prepend(document.createElement('li')).append(this);
			}
			actionPerformed = true;
		});
		return actionPerformed;
	}

	return ListPlugin;
});
