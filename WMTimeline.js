/* =========
  Timeline Plugin for Squarespace
  Create A Timeline Component from A Blog Collection
  This Code is Licensed by Will-Myers.com
========== */
(function () {
  const utils = {
    emitEvent: function (type, detail = {}, elem = document) {
      if (!type) return;
      let event = new CustomEvent(type, {
        bubbles: true,
        cancelable: true,
        detail: detail,
      });
      return elem.dispatchEvent(event);
    },
    async getHTML(url, selector = null) {
      try {
        let response = await fetch(`${url}`),
            selector = utils.templateVersion == '7' ? 'main > *:first-child' : '#sections' ;

        // If the call failed, throw an error
        if (!response.ok) {
          throw `Something went wrong with ${url}`;
        }

        let data = await response.text(),
            frag = document.createRange().createContextualFragment(data),
            section = frag.querySelector(selector).innerHTML;

        if (selector) section = frag.querySelector(selector).innerHTML;

        return section;

      } catch (error) {
        return `<div class="load-plugin wm-alert"><p>Hey there, it looks like the url you are using, <code>${url}</code>, doesn't exist. Check the URL in the code block. And don't worry, this note is only showing in the Squarespace Editor, not on the live site.</p><p>If you continue to have issues, reach out to our team here: <a>https://will-myers.com/ask</a></p></div>`
        console.error(error);
      }
    },
    async getCollection(url, options = {filter: null, cache: false}) {
      let time = new Date().getTime();
      try {
        let filterType,
          filter = options.filter,
          fromCache = options.cache,
          response;
        
        if (filter) {
          if (filter.includes('tag:')) filterType = 'tag';
          if (filter.includes('category:')) filterType = 'category';
          filter = filter.split(':')[1];
          response = await fetch(`${url}/${filterType}/${filter}?format=json${!fromCache ? '&time=' + time : ''}`);
        } else {
          response = await fetch(`${url}?format=json${!fromCache ? '&time=' + time : ''}`);
        }

        // If the call failed, throw an error
        if (!response.ok) {
          throw `Something went wrong with ${url}`;
        }

        let data = await response.json();
        
        return data;

      } catch (error) {
        return `<div class="wm-alert">
          <p>Hey there, it seems that the url${options.filter ? ' and category or tag filter' : ''} you are using, <strong><code>${url}${options.filter ? ', ' + options.filter : ''}</code></strong>, doesn't exist. Make sure to replace the <code>data-collection</code> attribute value in the code block with the right URL for the blog collection you'd like to use.</p>
          
          <p>This note is only showing in the Squarespace Editor, not on the live site. If you continue to have issues, reach out to our team here: <a href="https://will-myers.com/ask" target="_blank">https://will-myers.com/ask</a></p>
        </div>
        <style>
        
        </style>`
        console.error(error);
      }
    },
    getPropertyValue: function (el, prop) {
      let propValue = window.getComputedStyle(el).getPropertyValue(prop),
          cleanedValue = propValue.trim().toLowerCase(),
          value = cleanedValue;

      /*If First & Last Chars are Quotes, Remove*/
      if (cleanedValue.charAt(0).includes('"') || cleanedValue.charAt(0).includes("'")) value = value.substring(1);
      if (cleanedValue.charAt(cleanedValue.length-1).includes('"') || cleanedValue.charAt(cleanedValue.length-1).includes("'")) value = value.slice(0, -1);;

      if (value == 'true') value = true;
      if (value == 'false') value = false;
      return value;
    },
    templateVersion: Static.SQUARESPACE_CONTEXT.templateVersion,
    loadScripts: [],
    timelines: 0
  };

  let BuildTimeline = (function () {    

    function imageLoader(instance) {
      //if (!document.body.classList.contains('sqs-edit-mode')) return;
      let images = instance.elements.container.querySelectorAll('.tl-content img');
      images.forEach(el => {
        el.classList.add('wm-image-loaded')
        let fData = el.dataset.imageFocalPoint.split(',');
        let focalPoint = {};
        focalPoint.x = (parseFloat(fData[0]) * 100) + '%';
        focalPoint.y = (parseFloat(fData[1]) * 100) + '%';
        el.style.setProperty('--x', focalPoint.x);
        el.style.setProperty('--y', focalPoint.y);     
        el.dataset.load = true;
        el.src = el.dataset.src
      })
    }
    
    function setLastEventHeight(instance){
      let container = instance.elements.container,
          lastEvent = instance.elements.lastEvent,
          height = lastEvent.getBoundingClientRect().height;
      
      container.style.setProperty('--last-event-height', height + 'px');
    }
    
    function buildHTML(instance) {
      let items = instance.settings.items,
          container = instance.elements.container,
          html = '',
          i = 0,
          media = instance.settings.media, 
          date = instance.settings.date, 
          titleFormat = getTitleFormat(instance.settings.titleFormat),
          content = instance.settings.content, 
          dateFormat = instance.settings.dateFormat, 
          reverse = instance.settings.reverse;
      
      items = reverse == true ? items : items.reverse();

      function getDate(str){
        let date = new Date(str)
        let options = {weekday: 'long', month: 'long',  day: 'numeric' };

        if (dateFormat == 'time') {
          options = {  hour: 'numeric',  minute: 'numeric'};
          return date.toLocaleTimeString(undefined, options)
        }
        if (dateFormat == 'time-24') {
          options = {  hour: 'numeric',  minute: 'numeric', hour12: false};
          return date.toLocaleTimeString(undefined, options)
        }
        if (dateFormat == 'weekday') {
          options = { weekday: 'long' };
        }
        if (dateFormat == 'month') {
          options = { month: 'long' };
        }
        if (dateFormat == 'year') {
          options = { year: 'numeric' };
        }

        return date.toLocaleDateString(undefined, options)
      }

      function getTitleFormat(titleFormat){
        let format =  {
          tag: 'h3',
          class: '',
          mono: false
        };
        if (titleFormat == 'h1') {
          format.tag = 'h1'
        }
        if (titleFormat == 'h2') {
          format.tag = 'h2'
        }
        if (titleFormat == 'h3') {
          format.tag = 'h3'
        }
        if (titleFormat == 'h4') {
          format.tag = 'h4'
        }
        if (titleFormat == 'p1') {
          format.tag = 'p';
          format.class = 'sqsrte-large'
        }
        if (titleFormat == 'p2') {
          format.tag = 'p'
        }
        if (titleFormat == 'p3') {
          format.tag = 'p'
          format.class = 'sqsrte-small'
        }
        if (titleFormat == 'mono') {
          format.tag = 'pre'
          format.mono = true;
        }
        return format
      }
      
      for (let item of items) {
        
        let xfp = item.mediaFocalPoint.x;
        let yfp = item.mediaFocalPoint.y;
        let dateEl = `<div class="tl-date"><p>${getDate(item.publishOn)}</p></div>`;
        let title = item.title;
        let body = item.body;
        let excerpt = item.excerpt;
        let image = item.assetUrl;
        let isFirstOrLast
            
        i = 0 ? isFirstOrLast = true : isFirstOrLast = false;
        i = items.length ? isFirstOrLast = true : isFirstOrLast = false;
        
        let event = `<div class="tl-event">
  ${date == 'opposite' ? dateEl : ''}
  <div class="tl-content sqs-block-html">
    <span class="arrow"></span>
    ${dateEl}
    <${titleFormat.tag} class="tl-title ${titleFormat.class}">
${titleFormat.mono ? `<code>` : ``}${title}${titleFormat.mono ? `</code>` : ``}</${titleFormat.tag}>
    <div class="tl-body">${content == 'body' ? body : excerpt}</div>
  </div>
  <div class="tl-media" style="--x: ${xfp}; --y: ${yfp};">
    ${media == "image" ? `<img src="${image}">` : ''}
  </div>
</div>`;
        
        html += event;
        i+=1;
      }
      container.insertAdjacentHTML('beforeend', `<div class="timeline-wrapper">
      ${html}
      <div class="tl-bar">
        <span></span>
      </div>
      </div>`);
      
      if (content == 'body') {
        imageLoader(instance)
      }
    }

    async function getData(instance) {
      let container = instance.elements.container,
        url = instance.settings.collectionUrl,
        cache = instance.settings.cache,
        options = {cache: cache},
        data = await utils.getCollection(url, options);

      if (typeof data === 'string' || data instanceof String) {
        container.insertAdjacentHTML('afterbegin', data)
        return;
      } 
      
      container.classList.add('wm-timeline');
      instance.settings.data = data;
      instance.settings.items = data.items;
      
      window.dispatchEvent(new Event(`WMTimeline${utils.timelines}:loaded`));
      utils.timelines += utils.timelines;
    }

    function addResizeEventListener(instance){
      window.addEventListener('resize', function(){
        setLastEventHeight(instance)
      })
    } 

    function Constructor(el) {
      let instance = this;
      instance.settings = {
        get collectionUrl() {
          let collection = el.dataset.collection
          return collection;
        },
        data: null,
        items: null,
        get cache() {
          let val = el.dataset.cache;
          if (val == 'undefined') {
            val = false
          } else if (val == 'true') {
            val = true
          } else {
            val = false
          }
          return val
        },
        get media() {
          let val = el.dataset.media;
          if (val == 'undefined') {
            val = 'dot'
          } else if (val == 'image') {
            val = el.dataset.media
          } else {
            val = 'dot'
          }
          return val
        },
        get date() {
          let val = el.dataset.date;
          if (val == 'undefined') {
            val = 'opposite'
          } else if (val == 'above title' || val == 'below title' || val == 'none') {
            val = el.dataset.date
          } else {
            val = 'opposite'
          }
          return val;
        },
        get titleFormat() {
          let val = el.dataset.titleFormat;
          if (val == 'undefined') {
            val = 'h3'
          } else if (val == 'h1' || val == 'h2' || val == 'h3' || val == 'h4' || val == 'p1' || val == 'p2' || val == 'p3' || val == 'mono') {
            val = el.dataset.titleFormat;
          } else {
            val = 'h3'
          }
          return val;
        },
        get content() {
          let val = el.dataset.content;
          if (val == 'undefined') {
            val = 'excerpt'
          } else if (val == 'body' || val == 'none') {
            val = el.dataset.content
          } else {
            val = 'excerpt'
          }
          return val;
        },
        get dateFormat() {
          let val = el.dataset.dateFormat;
          if (val == 'undefined') {
            val = 'normal'
          } else if (val == 'time' || val == 'time-24' || val == 'weekday' || val == 'month' || val == 'year') {
            val = el.dataset.dateFormat
          } else {
            val = 'normal'
          }
          return val
        },
        get reverse() {
          let shouldReverse = el.dataset.reverse == 'true' ? true : false;
          return shouldReverse
        },
      };
      
      instance.elements = {
        container: el,
        get header() {
          return document.querySelector('#header')
        },
        get lastEvent() {
          return this.container.querySelector('.tl-event:nth-last-of-type(2)')
        }
      };

      window.addEventListener(`WMTimeline${utils.timelines}:loaded`, function(){
        buildHTML(instance)
        setLastEventHeight(instance);
        addResizeEventListener(instance);
      });
      getData(instance);
    }

    return Constructor;
  }());

  let initTimeline = () => {
    let timelines = document.querySelectorAll('[data-wm-plugin="timeline"]');
    timelines.forEach(el => new BuildTimeline(el));
  }
  initTimeline();
  window.addEventListener('mercury:load', initTimeline)
  window.wmInitContentLoad = initTimeline;
}());
