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
	'ui/toggleButton',
	'ui/text',
	'ui/ui',
	'i18n!abbr/nls/i18n',
	'i18n!aloha/nls/i18n'
], function ( Aloha, jQuery, Plugin, Component, Surface, ToggleButton, 
              Text, Ui, i18n, i18nCore ) {
	'use strict';

	/**
	 * Local reference to the `Utils.Dom' object.
	 * @private
	 */
	var DomUtils = window.GENTICS.Utils.Dom;

	/**
	 * Gets the normalize range
	 * @param {Aloha.Selection} range
	 * @return {RangeObject}
	 *
	 * @private
	 */
	function getRange( range ) {
		return new window.GENTICS.Utils.RangeObject(
			range || Aloha.getSelection().getRangeAt( 0 ) );
	};

	/**
	 * register the plugin with unique name
	 */
	return Plugin.create( 'abbr', {
		/**
		 * Configure the available languages
		 */
		languages: [ 'en', 'de' ],

		/**
		 * Configure the available languages
		 */
		extendToWord: true,

		/**
		 * Initialize the plugin and set initialize flag on true
		 */
		init: function () {
			this._initUIComponents();
			this._bindInteractions();
		},

		/**
		 * Define the UI components needed by abbr plugin.
		 *
		 * @private
		 */
		_initUIComponents: function(){
			var plugin = this;

			/**
			 * Abbreviation component
			 * @class
			 * @extends {ToggleButton}
			 */
			Component.define( "abbr", ToggleButton, {
				/**
				 * Localized label
				 * @type {string}
				 */
				label: i18n.t( "button.createAbbr.label" ),

				/**
				 * Whether or not to show only the icon
				 * @type {boolean}
				 */
				iconOnly: true,

				/**
				 * Which icon to render
				 * @type {string}
				 */
				icon: "aloha-icon aloha-icon-abbr",

				/**
				 * Click callback
				 * @override
				 */
				click: function() {
					var abbr = plugin.findAbbr( Surface.range );
					if ( abbr ) {
						plugin.removeAbbr( Surface.range );
					} else {
						plugin.createAbbr( "", Surface.range );
					}
				},

				/**
				 * Selection change callback
				 * @override
				 */
				selectionChange: function() {
					var abbr = plugin.findAbbr();
					this.setState( !!abbr );
				}
			});

			/**
			 * Edit abbreviation component
			 * @class
			 * @extends {Text}
			 */
			plugin._abbrField = Component.define( "editAbbr", Text, {
				/**
				 * Selection change callback
				 * @override
				 */
				selectionChange: function() {
					var abbr = plugin.findAbbr();
					if ( abbr ) {
						this.show();
						this.element.val( abbr ? abbr.title : null );
					} else {
						this.hide();
					}
				},

				/**
				 * Sets the value of the abbreviation
				 * @param {string} value
				 * @override
				 */
				setValue: function( value ) {
					if ( value ) {
						plugin.findAbbr( Surface.range ).title = value;
					} else {
						plugin.removeAbbr( Surface.range );
					}
				}
			});
		},

		/**
		 * Parse all editables for abbreviations
		 * Add the abbr shortcut to all edtiables
		 *
		 * @private
		 */
		_bindInteractions: function () {
			var plugin = this;

			// add abbr shortcut when an editable is created
			Aloha.bind('aloha-editable-created', function(event, editable) {
				// CTRL+G
				editable.obj.keydown( function ( e ) {
					if ( e.metaKey && e.which == 71 ) {
						if ( plugin.findAbbr() ) {
							// TODO: Figure out how to do this with new UI
							//FloatingMenu.activateTabOfButton( 'abbrText' );
							
							plugin._abbrField.focus();
						} else {
							plugin.createAbbr( "" );
						}
							
						// prevent from further handling
						// on a MAC Safari cursor would jump to location bar. Use ESC then META+L
						e.stopPropagation();
						e.preventDefault();
							
						return false;
					}
				});
			});
		},

		/**
		 * Finds an abbreviation from a range
		 * @param {Aloha.Selection} range
		 * @return {(DOMElement|null)}
		 */
		findAbbr: function(range) {
			return Ui.util.findElemFromRange( "abbr", range );
		},

		/**
		 * Creates an abbreviation in a range
		 * @param {string} title
		 * @param {Aloha.Selection} range
		 */
		createAbbr: function(title, range) {
			var plugin = this;
			var range = getRange(range);

			// do not insert a abbr in a abbr
			if ( plugin.findAbbr(range) ) {
					return;
			}

			// activate floating menu tab
			// TODO: Figure out how to do this in new UI
			// FloatingMenu.activateTabOfButton('abbrText');

			// if selection is collapsed then extend to the word.
			if ( range.isCollapsed() && plugin.extendToWord != false ) {
					DomUtils.extendToWord( range );
			}
		
			if ( range.isCollapsed() ) {
				// insert a abbr with text here
				var abbrText = i18n.t( 'newabbr.defaulttext' );
				var newAbbr = jQuery( '<abbr>', { title: title } );

				DomUtils.insertIntoDOM( newAbbr, range, jQuery( Aloha.activeEditable.obj ) );
				range.startContainer = range.endContainer = newAbbr.contents().get( 0 );
				range.startOffset = 0;
				range.endOffset = abbrText.length;
			} else {
				DomUtils.addMarkup( range ,
					jQuery( "<abbr>", { title: title } ), false );
			}

			//TODO: How to get access to instance of component?
			//plugin._abbrField.focus();
		
			//TODO: trying to select the range after `DomUtils.addMarkup()` 
			//gives an error.
			range.select();

		},

		/**
		 * Removes an abbreviation from a range
		 * @param {Aloha.Selection} range
		 */
		removeAbbr: function(range) {
			var plugin = this;
			var range = getRange(range);

			DomUtils.removeFromDOM( plugin.findAbbr( range ), range, true );

			// select the (possibly modified) range
			range.select();
		},

		/**
		 * Make the given jQuery object (representing an editable) clean for saving
		 * Find all abbrs and remove editing objects
		 * @param obj jQuery object to make clean
		 * @return void
		 */
		makeClean: function ( obj ) {
			// nothing to do...
		},

		/**
		* toString method
		* @return string
		*/
		toString: function () {
			return 'abbr';
		}

	} );
	
} );
