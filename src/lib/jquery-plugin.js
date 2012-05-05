/*!
* This file is part of Aloha Editor Project http://aloha-editor.org
* Copyright © 2010-2011 Gentics Software GmbH, aloha@gentics.com
* Contributors http://aloha-editor.org/contribution.php 
* Licensed unter the terms of http://www.aloha-editor.org/license.html
*//*
* Aloha Editor is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.*
*
* Aloha Editor is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

(function () {
	/**
	 * This requirejs module loader loads jquery plugins and wraps them 
	 */
	define({
		load: function (name, require, load, config) {
			var url = require.toUrl(name + '.js');

			require(['aloha/jquery'], function(value) {
				var $ = value;
				$.ajax({
 					type: 'GET',
					// Avoid strange asynchronous loading errors.
					// The particular case where this occurred was loading the
					// jquery-ui-autocomplete-html vendor file in ui/lib/autocomplete.js.
					// The problem was reproducable in the boilerplate demo: it never
					// loaded on my system. It is unknown why synchronous loading solves
					// the problem (I was just trying various things). Since there were
					// serveral cases in the past where asynchronous loading caused
					// problems, which were not clearly reproducable, it's best to leave
					// this on even if the autocomplete.js problem is fixed in the future.
					async: false,
				  	url: url,
				  	cache: true,
				  	dataType: 'text',
				  	success: function(plugin) {
//						plugin = '(function(jQuery) { var $ = jQuery;\n' + plugin + '}(window.alohaQuery));';
						plugin = 'define([\'aloha/jquery\'], function(jQuery) { var $ = jQuery;\n' + plugin + '});'
						load.fromText(name, plugin);
						load(null);
					}
				});
			});
		}
	});
}());
