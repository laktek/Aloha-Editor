/*!
 * Aloha Editor
 * Author & Copyright (c) 2010-2012 Gentics Software GmbH
 * aloha-sales@gentics.com
 * Licensed unter the terms of http://www.aloha-editor.com/license.html
 */

define([
	'aloha',
	'aloha/plugin',
	'aloha/jquery',
	'aloha/pluginmanager',
	'i18n!table/nls/i18n',
	'i18n!aloha/nls/i18n',
	'table/table-create-layer',
	'table/table',
	'table/table-plugin-utils',
	'ui/component',
	'ui/surface',
	'ui/autocomplete',
	'ui/button',
	'ui/toggleButton',
	"ui/multiSplit",
	"ui/tab",
	'ui/ui',
	'css!table/css/table.css'
],
function( Aloha, Plugin, jQuery, PluginManager, i18n, i18nCore,
          CreateLayer, Table, Utils, Component, Surface, Autocomplete,
          Button, ToggleButton, MultiSplit, Tab, Ui ) {
	'use strict';

	var GENTICS = window.GENTICS;

	/**
	 * Register the TablePlugin as Aloha.Plugin
	 */
	var TablePlugin = new Plugin('table');

	/**
	 * The Create-Layer Object of the TablePlugin
	 *
	 * @see Table.CreateLayer
	 */
	TablePlugin.createLayer = undefined;

	/**
	 * Configure the available languages
	 */
	TablePlugin.languages = ['en', 'de', 'fr', 'eo', 'fi', 'ru', 'it', 'pl'];

	/**
	 * default button configuration
	 */
	TablePlugin.config = [ 'table' ];

	/**
	 * An Array which holds all newly created tables contains DOM-Nodes of
	 * table-objects
	 */
	TablePlugin.TableRegistry = new Array();

	/**
	 * Holds the active table-object
	 */
	TablePlugin.activeTable = undefined;

	/**
	 * parameters-objects for tables
	 *
	 * @param className
	 *            The class of activated tables
	 */
	TablePlugin.parameters = {
		className            : 'aloha-table',                 // class of editable tables
		classSelectionRow    : 'aloha-table-selectcolumn',    // class for the upper table-row to select columns
		classSelectionColumn : 'aloha-table-selectrow',       // class for the left bound table-cells to select rows
		classLeftUpperCorner : 'aloha-table-leftuppercorner', // class for the left upper corner cell
		classTableWrapper    : 'aloha-table-wrapper',         // class of the outest table-wrapping div
		classCellSelected    : 'aloha-cell-selected',         // class of cell which are selected (row/column selection)
		waiRed               : 'aloha-wai-red',               // class that shows wai of div
		waiGreen             : 'aloha-wai-green',             // class that shows wai of div
		selectionArea        : 10                             // width/height of the selection rows (in pixel)
	};

	/**
	 * Init method of the Table-plugin transforms all tables in the document
	 *
	 * @return void
	 */
	TablePlugin.init = function() {
		var tableSettings = Aloha.settings.table; //this.settings

		this.tableFormats = tableSettings.formats.table || [];
		this.rowFormats = tableSettings.formats.row || [];
		this.columnFormats = tableSettings.formats.column || [];
		this.summaryinsidebar = tableSettings.summaryinsidebar;
		
		// add reference to the create layer object
		this.createLayer = new CreateLayer( this );

		var that = this;

		// subscribe for the 'editableActivated' event to activate all tables in the editable
		Aloha.bind( 'aloha-editable-created', function ( event, editable ) {

			// add a mousedown event to all created editables to check if focus leaves a table
			editable.obj.bind( 'mousedown', function ( jqEvent ) {
				TablePlugin.setFocusedTable( undefined );
			} );

			editable.obj.find( 'table' ).each( function () {
				// only convert tables which are editable
				if ( that.isEditableTable( this ) &&
						!TablePlugin.isWithinTable( this ) ) {
					var table = new Table( this, TablePlugin );
					table.parentEditable = editable;
					// table.activate();
					TablePlugin.TableRegistry.push( table );
				}
				
				TablePlugin.checkForNestedTables( editable.obj );
			} );
		} );

		// initialize the table buttons
		this.initTableButtons();

		// initialize the summary for table 
		this.initTableSummary();

		Aloha.bind( 'aloha-table-selection-changed', function () {
			if ( null != TablePlugin.activeTable &&
					0 !== TablePlugin.activeTable.selection.selectedCells.length ) {
						Aloha.trigger("aloha-special-selection-changed", [ TablePlugin.activeTable.selection.selectedCells, TablePlugin.activeTable.selection.selectionType ]);
			}
		});

		Aloha.bind( 'aloha-selection-changed', function (event, rangeObject) {
			// this case probably occurs when the selection is empty?
			if ( null == rangeObject.startContainer ) {
				return;
			}

			if (Aloha.activeEditable) {
				var table = rangeObject.findMarkup(function () {
					return this.nodeName.toLowerCase() == 'table';
				}, Aloha.activeEditable.obj);

				if ( that.activeTable ) {
					// check whether we are inside a table
					if ( table ) {
						Aloha.trigger("aloha-special-selection-changed", [ [null], "table" ]);
					} else {
						//reset cell selection flags
						that.activeTable.selection.cellSelectionMode = false; 
						that.activeTable.selection.baseCellPosition = null;
						that.activeTable.selection.lastSelectionRange = null; 
						
						that.activeTable.focusOut();
					}
				}

			}
		});

		// subscribe for the 'editableActivated' event to activate all tables in the editable
		Aloha.bind( 'aloha-editable-activated', function (event, props) {
			props.editable.obj.find('table').each(function () {
				// shortcut for TableRegistry
				var tr = TablePlugin.TableRegistry;
				for (var i = 0; i < tr.length; i++) {
					if (tr[i].obj.attr('id') == jQuery(this).attr('id')) {
						// activate the table
						tr[i].activate();
						// and continue with the next table tag
						return true;
					}
				}

				// if we come here, we did not find the table in our registry, so we need to create a new one
				// only convert tables which are editable
				if ( that.isEditableTable( this ) &&
						!TablePlugin.isWithinTable( this ) ) {
					var table = new Table( this, TablePlugin );
					table.parentEditable = props.editable;
					table.activate();
					TablePlugin.TableRegistry.push( table );
				}
				
				TablePlugin.checkForNestedTables( props.editable.obj );
			});
		});

		// subscribe for the 'editableDeactivated' event to deactivate all tables in the editable
		Aloha.bind( 'aloha-editable-deactivated', function (event, properties) {
			if (TablePlugin.activeTable) {
				TablePlugin.activeTable.selection.unselectCells();
			}
			TablePlugin.setFocusedTable(undefined);

			// shortcut for TableRegistry
			var tr = TablePlugin.TableRegistry;
			for (var i = 0; i < tr.length; i++) {
				// activate the table
				tr[i].deactivate();
			}
		});
		
		Aloha.bind( 'aloha-smart-content-changed', function ( event ) {
			if ( Aloha.activeEditable ) {
				Aloha.activeEditable.obj.find( 'table' ).each( function () {
					if ( TablePlugin.indexOfTableInRegistry( this ) == -1 &&
							!TablePlugin.isWithinTable( this ) ) {
						this.id = GENTICS.Utils.guid();
						
						var table = new Table( this, TablePlugin );
						table.parentEditable = Aloha.activeEditable;
						TablePlugin.TableRegistry.push( table );
						table.activate();
					}
					
					TablePlugin.checkForNestedTables( Aloha.activeEditable.obj );
				} );
			}
		} );

	};

	/**
	* initializes the table summary component 
	*/
	TablePlugin.initTableSummary = function(){
		var that = this;
		/**
		 * Table summary component
		 * @class
		 * @extends {Component}
		 */
		 Component.define( "tableSummary", Component, {
			 /**
				* Initializes the table summary panel
				* @override
				*/
				init: function() {
					this.element = jQuery( "<div>" );

					this.summaryLabel = jQuery( "<label>" +  i18n.t('table.label.target') + "</label>" )
							.appendTo( this.element );

					this.summaryField = jQuery( "<textarea></textarea>")
							.bind( "keyup", function() {
								if (that.activeTable) {
									that.activeTable.obj.attr('summary', jQuery(this).val());
									var waiDiv = jQuery('div[class*="wai"]', 'table#' + that.activeTable.obj.attr('id'));
									waiDiv.removeClass("aloha-wai-green");
									waiDiv.removeClass("aloha-wai-red");
										
									if (jQuery(this).val().trim() != '') {
										waiDiv.addClass("aloha-wai-green");
									} else {
										waiDiv.addClass("aloha-wai-red");
									}
								}
							})
							.appendTo( this.element )

				},

				/**
				 * Selection change callback
				 * @override
				 */
				selectionChange: function(range) {
					if(that.activeTable){
						this.summaryField.val(that.activeTable.obj.attr('summary'));
					} 
				}
		});
	};

	/**
	 * test if the table is editable
	 * @return boolean true if the table's parent element is contentEditable, false otherwise
	 */
	TablePlugin.isEditableTable = function (table) {
		return GENTICS.Utils.Dom.isEditable( table );
	};
	
	/**
	 * @param {DOMElement} table
	 * @return {Number}
	 */
	TablePlugin.indexOfTableInRegistry = function ( table ) {
		var registry = this.TableRegistry;
		
		for ( var i = 0; i < registry.length; i++ ) {
			// We need to find exactly the same object from the 
			// registry since we could also deal with cloned objects
			if ( registry[ i ].obj[ 0 ].id == table.id ) {
				return i;
			}
		}
		
		return -1;
	};
	
	/**
	 * @param {DOMElement} table
	 * @return {Table}
	 */
	TablePlugin.getTableFromRegistry = function ( table ) {
		var i = this.indexOfTableInRegistry( table );
		if ( i > -1 ) {
			return this.TableRegistry[ i ];
		}
		return null;
	};
	
	/**
	 * Checks whether the current selection is inside a table within an
	 * editable
	 *
	 * @return {Boolean} true if we are inside a table
	 */
	TablePlugin.isSelectionInTable = function () {
		var range = Aloha.Selection.getRangeObject();
		var container = jQuery( range.commonAncestorContainer );
		
		if ( container.length == 0 ) {
			return  false;
		}
		
		if ( container.parents( '.aloha-editable table' ).length ) {
			return true;
		}
		
		return false;
	};
	
	TablePlugin.preventNestedTables = function () {
		if ( this.isSelectionInTable() ) {
			Aloha.showMessage( new Aloha.Message( {
				title : i18n.t( 'Table' ),
				text  : i18n.t( 'table.createTable.nestedTablesNoSupported' ),
				type  : Aloha.Message.Type.ALERT
			} ) );
			
			return true;
		}
		
		return false;
	};
	
	/**
	 * Checks if the given element is within a table.
	 *
	 * @param {DOMElment} elem
	 * @return {Boolean} true if elem is nested within a table
	 */
	TablePlugin.isWithinTable = function ( elem ) {
		return ( jQuery( elem )
					.parents( '.aloha-editable table' )
						.length > 0 );
	};
	
	/**
	 * Checks for the presence of nested tables in the given editable.
	 * @todo complete
	 * @param {jQuery} editable
	 */
	TablePlugin.checkForNestedTables = function ( editable ) {
		if ( editable.find( 'table table' ).length ) {
			// show warning
		} else {
			// hide warning
		}
	};
	
	/**
	 * Adds default row buttons, and custom formatting buttons to floating menu
	 */
	TablePlugin.initRowsBtns = function () {
		var that = this;

		// add row before btn
		Component.define( "addrowbefore", Button, {
			/**
			 * Localized label
			 * @type {string}
			 */
			label: i18n.t( "button.addrowbefore.label" ),

			/**
			 * Whether or not to show only the icon
			 * @type {boolean}
			 */
			iconOnly: true,

			/**
			 * Which icon to render
			 * @type {string}
			 */
			icon: "aloha-icon aloha-icon-addrowbefore",

			/**
			 * Click callback
			 * @override
			 */
			click: function() {
				if (that.activeTable) {
					that.activeTable.addRowBeforeSelection();
				}
			}

		});

		// add row after btn
		Component.define( "addrowafter", Button, {
			/**
			 * Localized label
			 * @type {string}
			 */
			label: i18n.t( "button.addrowafter.label" ),

			/**
			 * Whether or not to show only the icon
			 * @type {boolean}
			 */
			iconOnly: true,

			/**
			 * Which icon to render
			 * @type {string}
			 */
			icon: "aloha-icon aloha-icon-addrowafter",

			/**
			 * Click callback
			 * @override
			 */
			click: function() {
				if (that.activeTable) {
					that.activeTable.addRowAfterSelection();
				}
			}
		});

		// delete rows btn
		Component.define( "deleterows", Button, {
			/**
			 * Localized label
			 * @type {string}
			 */
			label: i18n.t( "button.deleterows.label" ),

			/**
			 * Whether or not to show only the icon
			 * @type {boolean}
			 */
			iconOnly: true,

			/**
			 * Which icon to render
			 * @type {string}
			 */
			icon: "aloha-icon aloha-icon-deleterows",

			/**
			 * Click callback
			 * @override
			 */
			click: function() {
				if (that.activeTable) {
					var aTable = that.activeTable;
					Aloha.showMessage(new Aloha.Message({
						title : i18n.t('Table'),
						text : i18n.t('deleterows.confirm'),
						type : Aloha.Message.Type.CONFIRM,
						callback : function (sel) {
							if (sel == 'yes') {
								aTable.deleteRows();
							}
						}
					}));
				}
			}
		});

		// Format as a row header
		Component.define( "rowheader", ToggleButton, {
			/**
			 * Localized label
			 * @type {string}
			 */
			label: i18n.t( "button.rowheader.label" ),

			/**
			 * Whether or not to show only the icon
			 * @type {boolean}
			 */
			iconOnly: true,

			/**
			 * Which icon to render
			 * @type {string}
			 */
			icon: "aloha-icon aloha-icon-rowheader",

			/**
			 * Click callback
			 * @override
			 */
			click: function() {
				// table header
				if (that.activeTable) {
					var sc = that.activeTable.selection.selectedCells;
					that.rowsToSelect = [];

					var isHeader = that.activeTable.selection.isHeader();

					// if a selection was made, transform the selected cells
					for (var i = 0; i < sc.length; i++) {
						//            for (var j = 0; j < sc[i].length; j++) {
						if (i == 0) {
							that.rowsToSelect.push(sc[i].rowIndex);
						}
						
						if ( !isHeader ) {
										sc[i] = Aloha.Markup.transformDomObject(sc[i], 'th').attr('scope', 'col')[0];
						} else { 
										sc[i] = Aloha.Markup.transformDomObject(sc[i], 'td').removeAttr('scope')[0];
						}
						
						jQuery(sc[i]).bind('mousedown', function (jqEvent) {
							var wrapper = jQuery(this).children('div').eq(0);
							setTimeout(function () {
								wrapper.trigger('focus');
							}, 1);
							// unselect cells
							if (that.activeTable) {
								that.activeTable.selection.unselectCells();
							}
						});
						
						/*
						Destructive. For debugging.
						Indicate directionality of header
						jQuery(sc[i][j]).html('v');
						*/
						//            }
					}
					
					// selection could have changed.
					if (that.activeTable) {
						that.activeTable.refresh();
						that.activeTable.selectRows();
					}
				}
			},
			
			/**
			 * Selection change callback
			 * @override
			 */
			selectionChange: function(range){
				if(that.activeTable){
					var sc = that.activeTable.selection.selectedCells;
					var isHeader = that.activeTable.selection.isHeader();

					this.setState( isHeader ); 
				} else {
					this.setState( false ); 
				} 
			}
		});
	 
		/**
		 * Row formatting component
		 * @class
		 * @extends {MultiSplit}
		 */
		var FormatRow = Component.define( "formatRow", MultiSplit, {
			/**
			 * Gets the buttons for the multi split menu
			 * @returns {Array.<Object>}
			 */
			getButtons: function() {
				return jQuery.map( that.rowFormats, function( block ) {
					return FormatRow._buttons[ block ];
				});
			},

			/**
			 * Gets the items for bottom of the multi split menu
			 * @returns {Array.<Object>}
			 */
			getItems: function() {
				return [{
					label: i18n.t( "button.removeFormatting.label" ),
					click: function() {
						if (that.activeTable) {
							var sc = that.activeTable.selection.selectedCells;

							// remove formatting of selected columns
							this.transformRowFormatting(sc, true); 
							
							// selection could have changed.
							that.activeTable.selectRows();
						}
					}
				}];
			},

			/**
			* Transforms selected cells
			* @param {Array.<cells>} sc
			* @param {String} block 
			*/
			transformRowFormatting: function(sc, block){
				for (var i = 0; i < sc.length; i++) {
					// remove all rowformattings
					for (var f = 0; f < that.rowFormats.length; f++) {
						jQuery(sc[i]).removeClass("table-style-" + that.rowFormats[f]);
					}

					// set new block 
					if(block){
						jQuery(sc[i]).addClass("table-style-" + block);
					}
				}
			}
		});

		/**
		 * Settings for all format row buttons
		 * @type {Array.<Object>}
		 */
		FormatRow._buttons = {};
		jQuery.each( that.rowFormats, function( i, block ) {
			FormatRow._buttons[ block ] = {
				label: i18n.t( "button." + block + ".label" ),
				icon: "aloha-large-icon-" + block,
				click: function() {
					if (that.activeTable) {
						var sc = that.activeTable.selection.selectedCells;

						// transform selected columns
						this.transformRowFormatting(sc, block); 

						// selection could have changed.
						that.activeTable.selectRows();
					}
				},
				isActive: function() {
					// TODO: Figure out way to detect the active state
					//return Aloha.queryCommandValue( "formatBlock" ) === block;
				}
			};
		});
	};

	/**
	 * Adds default column buttons, and custom formatting buttons to floating menu
	 */
	TablePlugin.initColumnBtns = function () {
		var that = this;

		// add column left btn
		Component.define( "addcolumnleft", Button, {
			/**
			 * Localized label
			 * @type {string}
			 */
			label: i18n.t( "button.addcolumnleft.label" ),

			/**
			 * Whether or not to show only the icon
			 * @type {boolean}
			 */
			iconOnly: true,

			/**
			 * Which icon to render
			 * @type {string}
			 */
			icon: "aloha-icon aloha-icon-addcolumnleft",

			/**
			 * Click callback
			 * @override
			 */
			click: function() {
				if (that.activeTable) {
					that.activeTable.addColumnsLeft();
				}
			}

		});

		// add column right btn
		Component.define( "addcolumnright", Button, {
			/**
			 * Localized label
			 * @type {string}
			 */
			label: i18n.t( "button.addcolumnright.label" ),

			/**
			 * Whether or not to show only the icon
			 * @type {boolean}
			 */
			iconOnly: true,

			/**
			 * Which icon to render
			 * @type {string}
			 */
			icon: "aloha-icon aloha-icon-addcolumnright",

			/**
			 * Click callback
			 * @override
			 */
			click: function() {
				if (that.activeTable) {
					that.activeTable.addColumnsRight();
				}
			}
		});

		// delete columns btn
		Component.define( "deletecolumns", Button, {
			/**
			 * Localized label
			 * @type {string}
			 */
			label: i18n.t( "button.deletecolumns.label" ),

			/**
			 * Whether or not to show only the icon
			 * @type {boolean}
			 */
			iconOnly: true,

			/**
			 * Which icon to render
			 * @type {string}
			 */
			icon: "aloha-icon aloha-icon-deletecolumns",

			/**
			 * Click callback
			 * @override
			 */
			click: function() {
				if (that.activeTable) {
					var aTable = that.activeTable;
					Aloha.showMessage(new Aloha.Message({
						title : i18n.t('Table'),
						text : i18n.t('deletecolumns.confirm'),
						type : Aloha.Message.Type.CONFIRM,
						callback : function (sel) {
							if (sel == 'yes') {
								aTable.deleteColumns();
							}
						}
					}));
				}
			}
		});

		// Format as a column header
		Component.define( "columnheader", ToggleButton, {
			/**
			 * Localized label
			 * @type {string}
			 */
			label: i18n.t( "button.columnheader.label" ),

			/**
			 * Whether or not to show only the icon
			 * @type {boolean}
			 */
			iconOnly: true,

			/**
			 * Which icon to render
			 * @type {string}
			 */
			icon: "aloha-icon aloha-icon-columnheader",

			/**
			 * Click callback
			 * @override
			 */
			click: function() {
				// table header
				if (that.activeTable) {
						var 
							selectedColumnIdxs = that.activeTable.selection.selectedColumnIdxs,
							cell,
							isHeader = that.activeTable.selection.isHeader();

						for (var j = 0; j < that.activeTable.selection.selectedCells.length; j++) {
							cell = that.activeTable.selection.selectedCells[j];
								if ( isHeader ) {
									cell = Aloha.Markup.transformDomObject( cell, 'td' ).removeAttr( 'scope' ).get(0);
								} else { 
									cell = Aloha.Markup.transformDomObject( cell, 'th' ).attr( 'scope', 'row' ).get(0);
								}
							
								jQuery( that.activeTable.selection.selectedCells[j] ).bind( 'mousedown', function ( jqEvent ) {
										var wrapper = jQuery(this).children('div').eq(0);
										// lovely IE ;-)
										setTimeout(function () {
											wrapper.trigger( 'focus' );
										}, 1);
										// unselect cells
								});
							
						}
						// selection the column.
						that.activeTable.refresh();
						that.activeTable.selection.unselectCells();
						that.activeTable.selection.selectColumns( selectedColumnIdxs );
				}
			},

			/**
			 * Selection change callback
			 * @override
			 */
			selectionChange: function(){
				if(that.activeTable){
					var isHeader = that.activeTable.selection.isHeader();
					this.setState( isHeader ); 
				} else {
					this.setState( false ); 
				} 
			}

		});
		
		/**
		 * Column formatting component
		 * @class
		 * @extends {MultiSplit}
		 */
		var FormatColumn = Component.define( "formatColumn", MultiSplit, {
			/**
			 * Gets the buttons for the multi split menu
			 * @returns {Array.<Object>}
			 */
			getButtons: function() {
				return jQuery.map( that.columnFormats, function( block ) {
					return FormatColumn._buttons[ block ];
				});
			},

			/**
			 * Gets the items for bottom of the multi split menu
			 * @returns {Array.<Object>}
			 */
			getItems: function() {
				return [{
					label: i18n.t( "button.removeFormatting.label" ),
					click: function() {
						if (that.activeTable) {
							var sc = that.activeTable.selection.selectedCells;

							// remove formatting of selected columns
							this.transformColumnFormatting(sc, true); 
							
							// selection could have changed.
							that.activeTable.selectColumns();
						}
					}
				}];
			},

			/**
			* Transforms selected cells
			* @param {Array.<cells>} sc
			* @param {String} block 
			*/
			transformColumnFormatting: function(sc, block){
				for (var i = 0; i < sc.length; i++) {
					// remove all columnformattings
					for (var f = 0; f < that.columnFormats.length; f++) {
						jQuery(sc[i]).removeClass("table-style-" + that.columnFormats[f]);
					}

					// set new block 
					if(block){
						jQuery(sc[i]).addClass("table-style-" + block);
					}
				}
			}
		});

		/**
		 * Settings for all format column buttons
		 * @type {Array.<Object>}
		 */
		FormatColumn._buttons = {};
		jQuery.each( that.columnFormats, function( i, block ) {
			FormatColumn._buttons[ block ] = {
				label: i18n.t( "button." + block + ".label" ),
				icon: "aloha-large-icon-" + block,
				click: function() {
					if (that.activeTable) {
						var sc = that.activeTable.selection.selectedCells;

						// transform selected columns
						this.transformColumnFormatting(sc, block); 

						// selection could have changed.
						that.activeTable.selectColumns();
					}
				},
				isActive: function() {
					// TODO: Figure out way to detect the active state
					//return Aloha.queryCommandValue( "formatBlock" ) === block;
				}
			};
		});
	};

	/**
	 * initialize merge/split cells buttons 
	 */
	TablePlugin.initMergeSplitButtons = function () {
		var that = this;

		Component.define( "mergecells", Button, {
			/**
			 * Localized label
			 * @type {string}
			 */
			label: i18n.t( "button.mergecells.label" ),

			/**
			 * Whether or not to show only the icon
			 * @type {boolean}
			 */
			iconOnly: true,

			/**
			 * Which icon to render
			 * @type {string}
			 */
			icon: "aloha-icon aloha-icon-mergecells",

			/**
			 * Click callback
			 * @override
			 */
			click: function() {
				if (that.activeTable) {
					that.activeTable.selection.mergeCells();
				}
			}

		});

		Component.define( "splitcells", Button, {
			/**
			 * Localized label
			 * @type {string}
			 */
			label: i18n.t( "button.splitcells.label" ),

			/**
			 * Whether or not to show only the icon
			 * @type {boolean}
			 */
			iconOnly: true,

			/**
			 * Which icon to render
			 * @type {string}
			 */
			icon: "aloha-icon aloha-icon-splitcells",

			/**
			 * Click callback
			 * @override
			 */
			click: function() {
				if (that.activeTable) {
					that.activeTable.selection.splitCells();
				}
			}

		});
	}

	/**
	 * initialize the buttons and register them on floating menu
	 */
	TablePlugin.initTableButtons = function () {
		var that = this;

		Component.define( "createTable", Button, {
			/**
			 * Localized label
			 * @type {string}
			 */
			label: i18n.t( "button.createTable.label" ),

			/**
			 * Whether or not to show only the icon
			 * @type {boolean}
			 */
			iconOnly: true,

			/**
			 * Which icon to render
			 * @type {string}
			 */
			icon: "aloha-icon aloha-icon-createTable",

			/**
			 * Click callback
			 * @override
			 */
			click: function() {
				TablePlugin.createDialog(this.element);
			},

			/**
			 * Selection change callback
			 * @override
			 */
			selectionChange: function() {
			}
		});

		// generate formatting buttons for columns
		this.initColumnBtns();

		// generate formatting buttons for rows
		this.initRowsBtns();

		// generate merge/split buttons 
		this.initMergeSplitButtons();

		/**
		 * Table formatting component
		 * @class
		 * @extends {MultiSplit}
		 */
		var FormatTable = Component.define( "formatTable", MultiSplit, {
			/**
			 * Gets the buttons for the multi split menu
			 * @returns {Array.<Object>}
			 */
			getButtons: function() {
				return jQuery.map( that.tableFormats, function( block ) {
					return FormatTable._buttons[ block ];
				});
			},

			/**
			 * Gets the items for bottom of the multi split menu
			 * @returns {Array.<Object>}
			 */
			getItems: function() {
				return [{
					label: i18n.t( "button.removeFormatting.label" ),
					click: function() {
						// remove all table classes
						if (that.activeTable) {
							for (var f = 0; f < that.tableFormats.length; f++) {
								that.activeTable.obj.removeClass(that.tableFormats[f]);
							}
						}
					}
				}];
			},
		});

		/**
		 * Settings for all format table buttons
		 * @type {Array.<Object>}
		 */
		FormatTable._buttons = {};
		jQuery.each( that.tableFormats, function( i, block ) {
			FormatTable._buttons[ block ] = {
				label: i18n.t( "button." + block + ".label" ),
				icon: "aloha-large-icon-" + block,
				click: function() {
					// set table css class
					if (that.activeTable) {
						for (var f = 0; f < that.tableFormats; f++) {
							that.activeTable.obj.removeClass(that.tableFormats[f]);
						}
						that.activeTable.obj.addClass(block);
					}
				},
				isActive: function() {
					// TODO: Figure out way to detect the active state
				}
			};
		});

		/**
		 * Table Caption component
		 * @class
		 * @override {ToggleButton}
		 */
		Component.define( "tableCaption", ToggleButton, {
			/**
			 * Localized label
			 * @type {string}
			 */
			label: i18n.t( "button.tableCaption.label" ),

			/**
			 * Whether or not to show only the icon
			 * @type {boolean}
			 */
			iconOnly: true,

			/**
			 * Which icon to render
			 * @type {string}
			 */
			icon: "aloha-icon aloha-icon-table-caption",

			/**
			 * Click callback
			 * @override
			 */
			click: function() {
				if (that.activeTable) {
					// look if table object has a child caption
					if ( that.activeTable.obj.children("caption").is('caption') ) {
						that.activeTable.obj.children("caption").remove();
						// select first cell of table
					} else {
						var captionText = i18n.t('empty.caption');
						var c = jQuery('<caption></caption>');
						that.activeTable.obj.append(c);
						that.makeCaptionEditable(c, captionText);

						// get the editable span within the caption and select it
						var cDiv = c.find('div').eq(0);
						var captionContent = cDiv.contents().eq(0);
						if (captionContent.length > 0) {
							var newRange = new GENTICS.Utils.RangeObject();
							newRange.startContainer = newRange.endContainer = captionContent.get(0);
							newRange.startOffset = 0;
							newRange.endOffset = captionContent.text().length;

							// blur all editables within the table
							that.activeTable.obj.find('div.aloha-table-cell-editable').blur();

							cDiv.focus();
							newRange.select();
							Aloha.Selection.updateSelection();
						}
					}
				}
			},

			/**
			 * Selection change callback
			 * @override
			 */
			selectionChange: function() {
				//var value = Aloha.queryCommandValue( "createLink" );
				if(that.activeTable){
					if(that.activeTable.obj.children('caption').length > 0){
						this.setState( true );
					}
				} else {
					this.setState( false );
				}
			}
		});

	};

	/**
	 * Helper method to make the caption editable
	 * @param caption caption as jQuery object
	 * @param captionText default text for the caption
	 */
	TablePlugin.makeCaptionEditable = function(caption, captionText) {
		var that = this;
		var cSpan = caption.children('div').eq(0);
		if (cSpan.length == 0) {
			// generate a new div
			cSpan = jQuery('<div></div>');
			jQuery(cSpan).addClass('aloha-ui');
			jQuery(cSpan).addClass('aloha-editable-caption');
			if (caption.contents().length > 0) {
				// when the caption has content, we wrap it with the new div
				caption.contents().wrap(cSpan);
			} else {
				// caption has no content, so insert the default caption text
				if (captionText) {
					cSpan.text(captionText);
				}
				// and append the div into the caption
				caption.append(cSpan);
			}
		}
		// make the div editable
		cSpan.contentEditable(true);
		cSpan.unbind('mousedown');
		// focus on click
		cSpan.bind('mousedown', function(jqEvent) {
			cSpan.focus();
			// stop bubble, otherwise the mousedown of the table is called ...
			jqEvent.preventDefault();
			jqEvent.stopPropagation();
			return false;
		});
	};

	/**
	 * This function adds the createDialog to the calling element
	 *
	 * @param callingElement
	 *            The element, which was clicked. It's needed to set the right
	 *            position to the create-table-dialog.
	 */
	TablePlugin.createDialog = function(callingElement) {
		// set the calling element to the layer the calling element mostly will be
		// the element which was clicked on it is used to position the createLayer
		this.createLayer.set('target', callingElement);

		// show the createLayer
		this.createLayer.show();

	};

	/**
	 * Creates a normal html-table, "activates" this table and inserts it into the
	 * active Editable
	 *
	 * @param cols
	 *            number of colums for the created table
	 * @param cols
	 *            number of rows for the created table
	 * @return void
	 */
	TablePlugin.createTable = function(cols, rows) {
		if ( this.preventNestedTables() ) {
			return;
		}
		
		// Check if there is an active Editable and that it contains an element (= .obj)
		if ( Aloha.activeEditable && typeof Aloha.activeEditable.obj !== 'undefined' ) {
			// create a dom-table object
			var table = document.createElement( 'table' );
			var tableId = table.id = GENTICS.Utils.guid();
			var tbody = document.createElement( 'tbody' );

			// create "rows"-number of rows
			for ( var i = 0; i < rows; i++ ) {
				var tr = document.createElement( 'tr' );
				// create "cols"-number of columns
				for ( var j = 0; j < cols; j++ ) {
					var text = document.createTextNode( '\u00a0' );
					var td = document.createElement( 'td' );
					td.appendChild( text );
					tr.appendChild( td );
				}
				tbody.appendChild( tr );
			}
			table.appendChild( tbody );
			
			prepareRangeContainersForInsertion(
				Aloha.Selection.getRangeObject(), table );
			
			// insert the table at the current selection
			GENTICS.Utils.Dom.insertIntoDOM(
				jQuery( table ),
				Aloha.Selection.getRangeObject(),
				Aloha.activeEditable.obj
			);
			
			cleanupAfterInsertion();
			
			var tableReloadedFromDOM = document.getElementById( tableId );

			if ( !TablePlugin.isWithinTable( tableReloadedFromDOM ) ) {
				var tableObj = new Table( tableReloadedFromDOM, TablePlugin );
				tableObj.parentEditable = Aloha.activeEditable;
				// transform the table to be editable
				tableObj.activate();

				// after creating the table, trigger a click into the first cell to
				// focus the content
				// for IE set a timeout of 10ms to focus the first cell, other wise it
				// won't work
				if ( jQuery.browser.msie ) {
					window.setTimeout( function () {
						tableObj.cells[ 0 ].wrapper.get( 0 ).focus();
					}, 20 );
				} else {
					tableObj.cells[ 0 ].wrapper.get( 0 ).focus();
				}

				TablePlugin.TableRegistry.push( tableObj );
			}
			
			TablePlugin.checkForNestedTables( Aloha.activeEditable.obj );
		// no active editable => error
		} else {
			this.error( 'There is no active Editable where the table can be\
				inserted!' );
		}
	};
	
	TablePlugin.setFocusedTable = function(focusTable) {
		var that = this;

		// clicking outside the table unselects the cells of the table
		if ( null == focusTable && null != this.activeTable ) {
			this.activeTable.selection.unselectCells();
		}

		for (var i = 0; i < TablePlugin.TableRegistry.length; i++) {
			TablePlugin.TableRegistry[i].hasFocus = false;
		}
		if (typeof focusTable != 'undefined') {
			if ( focusTable.obj.children("caption").is('caption') ) {
				// set caption button
        // Note: Commented till captions are fixed.
				//that.captionButton.setPressed(true);
				var c = focusTable.obj.children("caption");
				that.makeCaptionEditable(c);
			}
			focusTable.hasFocus = true;
		}
		TablePlugin.activeTable = focusTable;

  // Note: Commented
	// if (this.tableMSButton.extButton) {
	// 	// show configured formatting classes
	// 	for (var i = 0; i < this.tableMSItems.length; i++) {
	// 	  this.tableMSButton.showItem(this.tableMSItems[i].name);
	// 	}
	// 	this.tableMSButton.setActiveItem();
  //}
    
    // if (this.activeTable) {
    //   for (var i = 0; i < this.tableConfig.length; i++) {
    //     if (this.activeTable.obj.hasClass(this.tableConfig[i].cssClass)) {
    //       this.tableMSButton.setActiveItem(this.tableConfig[i].name);
    //       // TODO ???? k = this.tableConfig.length;
    //     }
    //   }
    // }
  };

	/**
	 * Calls the Aloha.log function with 'error' level
	 *
	 * @see Aloha.log
	 * @param msg
	 *            The message to display
	 * @return void
	 */
	TablePlugin.error = function(msg) {
		Aloha.Log.error(this, msg);
	};

	/**
	 * Calls the Aloha.log function with 'debug' level
	 *
	 * @see Aloha.log
	 * @param msg
	 *            The message to display
	 * @return void
	 */
	TablePlugin.debug = function(msg) {
		Aloha.Log.debug(this, msg);
	};

	/**
	 * Calls the Aloha.log function with 'info' level
	 *
	 * @see Aloha.log
	 * @param msg
	 *            The message to display
	 * @return void
	 */
	TablePlugin.info = function(msg) {
		Aloha.Log.info(this, msg);
	};

	/**
	 * Calls the Aloha.log function with 'info' level
	 *
	 * @see Aloha.log
	 * @param msg
	 *            The message to display
	 * @return void
	 */
	TablePlugin.log = function(msg) {
		Aloha.log('log', this, msg);
	};

	/**
	 * The "get"-method returns the value of the given key.
	 * First it searches in the config for the property.
	 * If there is no property with the given name in the
	 * "config"-object it returns the entry associated with
	 * in the parameters-object
	 *
	 * @param property
	 * @return void
	 *
	 */
	TablePlugin.get = function (property) {
		if (this.config[property]) {
			return this.config[property];
		}
		if (this.parameters[property]) {
			return this.parameters[property];
		}
		return undefined;
	};

	/**
	 * The "set"-method takes a key and a value. It checks if there is a
	 * key-value pair in the config-object. If so it saves the data in the
	 * config-object. If not it saves the data in the parameters-object.
	 *
	 * @param key the key which should be set
	 * @param value the value which should be set for the associated key
	 */
	TablePlugin.set = function (key, value) {
		if (this.config[key]) {
			this.config[key] = value;
		}else{
			this.parameters[key] = value;
		}
	};

	/**
	 * Make the given jQuery object (representing an editable) clean for saving
	 * Find all tables and deactivate them
	 * @param obj jQuery object to make clean
	 * @return void
	 */
	TablePlugin.makeClean = function ( obj ) {
		var that = this;
		obj.find( 'table' ).each( function () {
			// Make sure that we only deactivate tables in obj which have the
			// same id as tables which have been activated and registered
			if ( that.getTableFromRegistry( this ) ) {
				( new Table( this, that ) ).deactivate();
			}
		} );
	};
	
	/**
	 * String representation of the Table-object
	 *
	 * @return The plugins namespace (string)
	 */
	TablePlugin.toString = function() {
		return this.prefix;
	};

	PluginManager.register(TablePlugin);
	
	/**
	 * Detects a situation where we are about to insert content into a
	 * selection that looks like this: <p> [</p>...
	 * We will assume that the nbsp inside the <p> node was placed there to
	 * "prop-up" the empty paragraph--that is--to make the empty paragraph
	 * visible in HTML5 conformant rendering engines, like WebKit. Without the
	 * white space, such browsers would correctly render an empty <p> as
	 * invisible.
	 *
	 * If we detect this situation, we remove the white space so that when we
	 * paste new content into the paragraph, it is not be split and leaving an
	 * empty paragraph on top of the pasted content.
	 *
	 * Note that we do not use <br />'s to prop up the paragraphs, as WebKit
	 * does, because IE, will break from the HTML5 specification and will
	 * display empty paragraphs if they are content-editable. So a <br />
	 * inside an empty content-editable paragraph will result in 2 lines to be
	 * shown instead of 1 in IE.
	 * 
	 * @param {Object} range
	 * @param {DOMElement} table
	 */
	function prepareRangeContainersForInsertion ( range, table ) {
		var	eNode = range.endContainer,
			sNode = range.startContainer,
			eNodeLength = ( eNode.nodeType == 3 )
				? eNode.length
				: eNode.childNodes.length;		
		
		
		if ( sNode.nodeType == 3 &&
				sNode.parentNode.tagName == 'P' &&
					sNode.parentNode.childNodes.length == 1 &&
						/^(\s|%A0)$/.test( escape( sNode.data ) ) ) {
			sNode.data = '';
			range.startOffset = 0;
			
			// In case ... <p> []</p>
			if ( eNode == sNode ) {
				range.endOffset = 0;
			}
		}
		
		// If the table is not allowed to be nested inside the startContainer,
		// then it will have to be split in order to insert the table.
		// We will therefore check if the selection touches the start and/or
		// end of their container nodes.
		// If they do, we will mark their container so that after they are
		// split we can check whether or not they should be removed
		if ( !GENTICS.Utils.Dom.allowsNesting(
				sNode.nodeType == 3 ? sNode.parentNode : sNode, table ) ) {
			
			if ( range.startOffset == 0 ) {
				jQuery( sNode.nodeType == 3 ? sNode.parentNode : sNode )
					.addClass( 'aloha-table-cleanme' );
			}
			
			if ( range.endOffset == eNodeLength ) {
				jQuery( eNode.nodeType == 3 ? eNode.parentNode : eNode )
					.addClass( 'aloha-table-cleanme' );
			}
		}
	};
	
	/**
	 * Looks for elements marked with "aloha-table-cleanme", and removes them
	 * if they are absolutely empty.
	 * Note that this will leave paragraphs which contain empty nested elements
	 * even though they are also invisible.
	 * We can consider removing these as well at a later stage, if needed.
	 */
	function cleanupAfterInsertion () {
		var dirty = jQuery( '.aloha-table-cleanme' ).removeClass(
						'aloha-table-cleanme' );
		
		for ( var i = 0; i < dirty.length; i++ ) {
			if ( jQuery.trim( jQuery( dirty[ i ] ).html() ) == '' &&
					!GENTICS.Utils.Dom.isEditingHost( dirty[ i ] ) ) {
				jQuery( dirty[ i ] ).remove();
				
				/*
				// For debugging: to see what we are deleting
				jQuery( dirty[ i ] ).css({
					border: '3px solid red',
					display: 'block'
				});
				*/
			}
		}
	};
	
	return TablePlugin;
});
