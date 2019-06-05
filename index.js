/**
* Author
 @Inateno / http://inateno.com / http://dreamirl.com
*/

import DE from '@dreamirl/dreamengine';
import './index.css';

const TEMPLATE = `<div>
  <div class="name"></div>
  <div class="picture"></div>
  <span class="sizer"></span>
  <span class="content"></span>
  <div class="close"></div>
</div>`;

const DEFAULT_DOM_CONTAINER_ID = 'render';

/***
 * line return must be a /n with space before and after
 */
const MessageBox = function()
{
  DE.Events.Emitter.call( this );
  
  this.trigger = this.emit;
  
  this.DEName       = "MessageBox";
  this.mboxs        = {};
  this.nMboxs       = 0;
  this.el           = null;
  this.template     = TEMPLATE;
  this.inited       = false;
  this.textView     = null;
  this.closeBtn     = null;
  this.wordsArray   = [];
  this.currentWord  = 0;
  this.currentLetter= 0;
  this.isActive     = false;
  this.typingFx     = '';

  var _self = this;

  this.init = function( params )
  {
    if ( this.inited )
      return;
    params = params || {};

    this.template = params.template || TEMPLATE;
    this.typingFx = params.typingFx || '';

    let domContainer = document.getElementById( params.containerId || DEFAULT_DOM_CONTAINER_ID );
    
    if ( !domContainer ) {
      throw new Error( "FATAL ERROR: Can't init MessageBox without an element -- "
      + "selector:: " + params.selector );
      return;
    }

    this.el = document.createElement( 'div' );
    this.el.id = 'de-plugin-messagebox-container';

    domContainer.appendChild( this.el );
    this.inited = true;
    DE.MainLoop.additionalModules[ "MessageBoxUpdate" ] = this;
    
    DE.Inputs.on( "keyDown", "skipMessage", function()
    {
      if ( !_self.currentId )
        return;
      if ( !_self.isActive && _self.closeBtn )
        _self.mboxs[ _self.currentId ].manualClose();
      else
        _self.preventDynamicText();
    } );
    
    if ( params.useBuffer ) {
      this.buffer = new DE.PIXI.autoDetectRenderer( 1, 1, {
        transparent       : true
        ,clearBeforeRender: true
        ,autoResize       : true
      } );
      this.bufferContainer = new DE.PIXI.Container();
    }
  };
  
  this.renderBuffer = function( renderers, x, y, sizes )
  {
    this.bufferContainer.position.set( x || 0, y || 0 );
    var oldParents = [];
    for ( var i = 0; i < renderers.length; ++i )
    {
      oldParents.push( renderers[ i ].parent );
      MessageBox.bufferContainer.addChild( renderers[ i ] );
    }
    
    this.buffer.render( this.bufferContainer );
    if ( sizes ) {
      this.buffer.view.style.width  = sizes.w + 'px';
      this.buffer.view.style.height = sizes.h + 'px';
    }
    
    for ( i = 0; i < renderers.length; ++i )
    {
      oldParents[ i ].addChild( renderers[ i ] );
    }
  };

  /****
   * create a message box in the window, fill to window with js detection
   text is the content
    callback when close is called
    -> if there is a close className, it will close the messageBox on click
    -> you can configure an "closeMessageBox" inputs in the list to closes the messagesBox
    */
  this.create = function( text, callback, context, params )
  {
    params = params || {};
    
    if ( !this.inited )
      return;
    
    var id = Date.now() + "-" + ( Math.random() * 100 >> 0 );
    var mbox = document.createElement( 'div' );
      mbox.innerHTML = this.template;
    
    this.textView = mbox.getElementsByClassName( 'content' )[ 0 ];
    this.sizerEl = mbox.getElementsByClassName( 'sizer' )[ 0 ];
    // Split the string into words and init counters
    this.wordsArray    = text.split( " " );
    this.fullText      = text;
    this.currentWord   = 0;
    this.currentLetter = 0;
    this.currentVars   = params.vars || {};
    var closeBtn = mbox.getElementsByClassName( 'close' )[ 0 ] || null;
      mbox.id = 'de-messagebox-' + id;
      mbox.className = 'de-plugin-messagebox';
    this.currentId = mbox.id;
    
    this.nlines = ( text.match( / \/n /gi ) || [] ).length + 1;
    
    var initLines = "";
    for ( var i = 0; i < this.nlines; ++i ) { initLines += "<br />"; }
    this.sizerEl.innerHTML = initLines;
    
    if ( closeBtn ) {
      if ( params.noCloseButton ) {
        closeBtn.style.display = 'none';
        this.closeBtn = null;
      }
      else {
        closeBtn.addEventListener( "pointerup",
          function( e )
          {
            e.stopPropagation();
            e.preventDefault();
            mbox.manualClose();
            return false;
          }, false );
        closeBtn.style.display = "none";
        this.closeBtn = closeBtn;
      }
    }
    if ( params.buffer ) {
      this.buffer.resolution = params.buffer.resolution || 1;
      this.buffer.resize( params.buffer.width, params.buffer.height );
      mbox.getElementsByClassName( "picture" )[ 0 ].appendChild( this.buffer.view );
    }
    if ( params.name ) {
      mbox.getElementsByClassName( "name" )[ 0 ].innerHTML = params.name;
      mbox.getElementsByClassName( "name" )[ 0 ].className = "name " + ( params.side ? "side-" + params.side : "" );
    }
    else {
      mbox.getElementsByClassName( "name" )[ 0 ].className = "name";
      mbox.getElementsByClassName( "name" )[ 0 ].style.display = "none";
    }
    mbox.manualClose = function()
    {
      if ( params.sound )
        DE.Audio.fx.play( params.sound );
      _self.remove( mbox.id );
      if ( callback )
        callback.call( context || window );
    };
    mbox.addEventListener( "pointerup", function( e )
    {
      if ( !_self.isActive && _self.closeBtn )
        _self.mboxs[ _self.currentId ].manualClose();
      else
        _self.preventDynamicText();
      
      e.stopPropagation();
      e.preventDefault();
      return false;
    }, false );
    
    if ( params.lifeTime ) {
      setTimeout( function()
      {
        _self.mboxs[ _self.currentId ].manualClose();
      }, params.lifeTime );
    }
    this.el.appendChild( mbox );
    
    this.mboxs[ mbox.id ] = mbox;
    ++this.nMboxs;
    
    this.trigger( "create", mbox );
    this.isActive = true;
    this.prevented = false;
    
    return mbox;
  }

  this.shutDownCurrentBox = function()
  {
    if  ( !this.currentId ) {
      return false;
    }

    if ( this.isActive ) {
      this.preventDynamicText();
    }
    else if ( this.closeBtn ) {
      this.mboxs[ this.currentId ].manualClose();
    }

    return true;
  }
  
  this.removeAll = function()
  {
    this.nMboxs = 0;
    this.textView = null;
    this.isActive = false;
    this.currentId = null;
    this.trigger( "kill-em-all" );
    for ( var i in this.mboxs )
    {
      this.el.removeChild( this.mboxs[ i ] );
      this.mboxs[ i ].manualClose = undefined;
      delete this.mboxs[ i ];
    }
  };
  
  this.remove = function( id )
  {
    if ( !id || !this.mboxs[ id ] ) {
      return;
    }
    if ( this.mboxs[ id ].isRemoved ) {
      this.mboxs[ id ].manualClose = undefined;
      delete this.mboxs[ id ];
      return;
    }
    
    this.textView = null;
    this.isActive = false;
    this.mboxs[ id ].isRemoved = true;
    this.mboxs[ id ].manualClose = undefined;
    this.el.removeChild( this.mboxs[ id ] );
    this.currentId = null;
    this.trigger( "kill" );
    delete this.mboxs[ id ];
    if ( --this.nMboxs == 0 ) {
      this.trigger( "zero-messages-box" );
    }
  }

  this.update = function( time )
  {
    if ( !this.isActive || !this.textView || time < this.waitUntil ) {
      return;
    }
    
    // First, we check if we have finished the word
    if ( !this.wordsArray[ this.currentWord ][ this.currentLetter ] ) {
      this.currentWord++; // increments the current word
      this.currentLetter = 0;
      
      // If this was the last word, we end here
      if ( !this.wordsArray[ this.currentWord ] ) {
        if ( this.typingFx ) {
          DE.Audio.fx.stop( this.typingFx );
        }
        return this.endDynamicText();
      }
      
      this.textView.innerHTML += " ";
    }
    
    
    if ( this.wordsArray[ this.currentWord ][ this.currentLetter ] == "/"
      && this.wordsArray[ this.currentWord ][ this.currentLetter + 1 ] == "n" ) {
      this.textView.innerHTML += "<br />";
      this.currentLetter++;
      this.waitUntil = time + 150;
      if ( this.typingFx ) {      
        DE.Audio.fx.stop( this.typingFx );
      }
    }
    // detect vars injected
    else if ( this.wordsArray[ this.currentWord ][ this.currentLetter ] == "%"
      && this.wordsArray[ this.currentWord ][ this.wordsArray[ this.currentWord ].length - 1 ] == "%" ) {
      this.textView.innerHTML += this.currentVars[ this.wordsArray[ this.currentWord ] ] || " --var-error--";
      this.currentLetter = this.wordsArray[ this.currentWord ].length;
    }
    else {
      if ( this.typingFx && !DE.Audio.fx._fxs[ this.typingFx ].playing() ) {
        this.waitUntil = time + 100;
        if ( this.typingFx ) {
          DE.Audio.fx.play( this.typingFx );
        }
        return;
      }
      this.textView.innerHTML += this.wordsArray[ this.currentWord ][ this.currentLetter ];
      
      if ( this.wordsArray[ this.currentWord ][ this.currentLetter ] === "."
        && !this.wordsArray[ this.currentWord ][ this.currentLetter + 1 ] ) {
        this.waitUntil = time + 150;
        if ( this.typingFx ) {
          DE.Audio.fx.stop( this.typingFx );
        }
      }
    }
    
    this.currentLetter++;
  };
  
  this.preventDynamicText = function()
  {
    if ( this.typingFx ) {
      DE.Audio.fx.stop( this.typingFx );
    }
    if ( !this.isActive ) {
      return false;
    }
    
    if ( !this.textView ) {
      return false;
    }
    this.isActive = false;
    var tempText = this.fullText;
    for ( var i in this.currentVars )
    {
      tempText = tempText.replace( i, this.currentVars[ i ] );
    }
    this.textView.innerHTML = tempText.replace( /\/n/gi, "<br />" );
    if ( this.closeBtn ) {
      this.closeBtn.style.display = "block";
    }
    
    // set time out prevent current down input propagation to an other event handler (like ChoiceBox)
    setTimeout( function()
    {
      _self.trigger( "end-dynamic-text" );
    }, 100 );
    return true;
  };

  this.endDynamicText = function()
  {
    if ( this.typingFx ) {
      DE.Audio.fx.stop( this.typingFx );
    }
    this.isActive = false;
    // Show the button
    
    if ( this.closeBtn ) {
      this.closeBtn.style.display = "block";
    }
    this.trigger( "end-dynamic-text" );
    return true;
  };
};

MessageBox.prototype = Object.create( DE.Events.Emitter.prototype );
MessageBox.prototype.constructor = MessageBox;

const mb = new MessageBox();
export default mb;
