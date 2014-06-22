define("UlImages", ["addJqueryPlugin", "tmpl", "wpPhotos", "toastmessage", "text!ulImagesCss.css", "text!ulImagesTmpl.ftl"], function(addJqueryPlugin) {
    /**
     * Глобальные настройки 
     */
    var settings = {
        photosHolder: $()
        , addImagesLinkClass: "add-images-link"
        , nodeName: window.node_name
        , baseUrl: window.base_url
        , errorMessage: window.errorMessage
        , element: $()
    };
    /**
     * Глобальные переменные и константы
     */ 
    /**
     * @constant
     * @type {string}
     */
    var IMAGE_URL_DEFAULT_VALUE = 'Введите полный адрес файла в Интернете.';
    /**
     * @constant
     * @type {string}
     */
    var JQUERY_PLUGIN_NAME = "wpUlImages";
    /**
     * @type {number}
     */
    var counter = 0;
    /**
     * Конструктор UlImages. В конструкторе определюятся все свойства объекта. 
     * Защищенные и приватные свойства называются начиная с символа подчеркивания
     * @constructor
     * @extends {Object}
     * @param {Object} options
     */
    function UlImages(options) {
        $.extend(this, settings, options);
        /**
         * уникальный идентификатор объекта, 
         * используется для того чтобы задавать уникальные идишники дом элементам
         * @type {number}
         */
        this._uniqueId = 0;
        /**
         * @type {boolean}
         */
        this._denyAjax = false;
        /**
         * @type {array}
         */
        this._photoAlbums = [];
        /**
         * картинка, выбранная из фотоальбома
         * @type {number}
         */
        this._imageId = 0;
        
        this._init();
    }
    /**
     * Наследуемся от класса родителя и определяем методы. Защищенные и приватные методы называются начиная с символа подчеркивания
     */
    var methods = UlImages.prototype = new Object();
    /**
     * Создаем функциб с замыканием на наш объект
     * @param {string} name
     */
    methods._proxy = function(name) {
        var obj = this;
        return this["proxy-" + name] = this["proxy-" + name] || function(arg1) {
            obj[name](arg1);
        };
    };
    
    methods._init = function() {
        if (this.element.length != 1) {
            console.error("Не указан element при инициализации.");
            return;
        }
        if (this.photosHolder.length != 1) {
            console.error("Не указан контейнер для картинок.");
            return;
        }
        
        this._uniqueId = counter;
        counter++;
        
        this.element.addClass("images-holder");
        // добавим кнопку, открывающую окно с выбором способа загрузки картинки
        this._getAddImagesLink().appendTo(this.element);
        this._setAddImagesLinkEvents();
        
        if (this.photosHolder.parent().length == 0) {
            this.photosHolder.appendTo(this.element);
        }
    };
    /**
     * Вызывается перед отправкой аякса _loadImages. Скрываем контент, показываем прогресс загрузки, запрещаем запросы аякс
     */
    methods._loadImagesFromWorldBeforeSend = function() {
        $('#load-images-content').css({'display': 'none'});
        this._getImagesLoadingContent().insertAfter('#load-images-content');

        $.fancybox.update();
        $.fancybox.reposition();

        this._denyAjax = true;
    };
    /**
     * Вызывается при успешном выполнении аякса _loadImages. Добавляем загруженную картинку в контейнер со всеми картинками
     * @param {Object} json
     */
    methods._loadImagesFromWorldOnSuccess = function(json) {
        $('#load-images-content').next().remove();
        this.photosHolder.wpPhotos('addPhoto', json);

        $.fancybox.close();
    };
    /**
     * Вызывается при неудачном выполнении аякса _loadImages. Показываем окно для загрузки картинки и сообщаем пользователю об ошибке.
     * @param {Object} xhr
     * @param {number} status
     */
    methods._loadImagesFromWorldOnError = function(xhr, status) {
        $('#load-images-content').next().remove();
        this.errorMessage(xhr.responseText);
        $('#load-images-content').css({'display': 'block'});
        $.fancybox.update();
        $.fancybox.reposition();
    };
    /**
     * Вызывается после успешного или неудачного выполнения аякса _loadImages. Разрешаем выполнять новые аякс запросы
     * @param {Object} xhr
     * @param {number} status
     */
    methods._loadImagesFromWorldOnComplete = function(xhr, status) {
        this._denyAjax = false;
    };
    /**
     * Загружаем картинку из интернета
     */
    methods._loadImagesFromWorld = function() {
        var error = '';

        var query_string_part = '';

        var image_url = $('#load-images-image_url-inp').val();
        if (image_url == '') {  
            error += 'Введите адрес файла.';
        }
        if (query_string_part) {
            query_string_part += '&';
        }
        query_string_part += 'URL=' + image_url;

        if (error) {
            this.errorMessage(error);
            return;
        }
        this._loadImagesFromWorldBeforeSend();

        $.ajax({
            url: this.baseUrl + '/' + this.nodeName + "/external_image/0",
            type: 'post',
            dataType: 'json',
            data: query_string_part,
            context: this,
            success: this._loadImagesFromWorldOnSuccess,
            error: this._loadImagesFromWorldOnError,
            complete: this._loadImagesFromWorldOnComplete
        });
    };
    /**
     * Получим страничку для выбора способа загрузки 
     * @returns {jQuery}
     */
    methods._getLoadImagesContent = function() {
        return $('#loadImagesContent').tmpl();
    };
    /**
     * Показвыаем окно для выбора картинок из компьютера
     */
    methods._loadImagesPcLinkHandler = function() {
        /*$('#load-images-pc-inp').click();*/
        this._getImagePcContent().replaceAll('#load-images-content');
        this._setImagePcEvents();
        $.fancybox.update();
        $.fancybox.reposition();
    };
    /**
     * Показываем окно для ввода url из интернета
     */
    methods._loadImagesWorldLinkHandler = function() {
        this._getImageUrlContent().replaceAll('#load-images-content');
        this._setImageUrlEvents();
        $.fancybox.update();
        $.fancybox.reposition();
    };
    /**
     * Показываем окно для выбора фотоальбома
     */
    methods._loadImagesFolderLinkHandler = function() {
        if (this._getPhotoAlbumsImages() == undefined) {
            return;
        }
        this._getPhotoAlbumsImages().done(function() {
            this._getPhotoAlbumsImagesContent().replaceAll('#load-images-content');
            this._setPhotoAlbumsImagesEvents();
            $.fancybox.update();
            $.fancybox.reposition();
        });
            
    };
    /**
     * Закрываем окно fancybox
     */
    methods._loadImagesCloseHandler = function() {
        $.fancybox.close();
    };
    /**
     * Устанавливаем события для элементов в окне loadImages
     */
    methods._setLoadImagesEvents = function() {
        $('#load-images-pc-link').on('click', this._proxy("_loadImagesPcLinkHandler"));
        
        $('#load-images-world-link').on('click', this._proxy("_loadImagesWorldLinkHandler"));

        $('#load-images-folder-link').on('click', this._proxy("_loadImagesFolderLinkHandler"));
        $('#load-images-close').on('click', this._proxy("_loadImagesCloseHandler"));
    };
    /**
     * Получим кнопку - добавить изображения
     * @returns {jQuery}
     */
    methods._getAddImagesLink = function() {
        return $("#addImagesLink").tmpl({
            uniqueId: this._uniqueId
            , addImagesLinkClass: this.addImagesLinkClass
        });
    };
    /**
     * Открываем окно для выбора способа загрузки изображений
     */
    methods._addImagesLinkHandler = function() {
        $.fancybox.open({
            content: this._getLoadImagesContent(),
            wrapCSS: 'content-wrap',
            fitToView: false,
            modal: true,
            afterShow: this._proxy("_setLoadImagesEvents")
        });
    };
    /**
     * Устанавливаем события для кнопки - добавить изображения
     */
    methods._setAddImagesLinkEvents = function() {
        $('#add-images-link-' + this._uniqueId).on('click', this._proxy("_addImagesLinkHandler"));
    };
    /**
     * Получим страничку с прогрессом загрузки
     */
    methods._getImagesLoadingContent = function() {
        return $("#imagesLoadingContent").tmpl();
    };
    /**
     * Получим страничку с формой для указания url из интернета
     */
    methods._getImageUrlContent = function() {
        return $("#imageUrlContent").tmpl({
            imageUrlDefaultValue: IMAGE_URL_DEFAULT_VALUE
        });
    };
    /**
     * Показываем окно для выбора способа загрузки изображений
     */
    methods._loadImagesPrevHandlerForImageUrlContent = function() {
        this._getLoadImagesContent().replaceAll('#load-images-content');
        this._setLoadImagesEvents();
        $.fancybox.update();
        $.fancybox.reposition();
    };
    /**
     * Загружаем картинку из интернета
     */
    methods._loadImagesImageUrlBtnHandler = function() {
        this._loadImagesFromWorld();
    };
    /**
     * Устанавливаем события для элементов в окне imageUrl
     */
    methods._setImageUrlEvents = function() {
        $('#load-images-prev').on('click', this._proxy("_loadImagesPrevHandlerForImageUrlContent"));

        $('#load-images-close').on('click', this._proxy("_loadImagesCloseHandler"));
        $('#load-images-image_url-btn').on('click', this._proxy("_loadImagesImageUrlBtnHandler"));
    };
    /**
     * Получим страничку с формой для загрузки картинок из компьютера клиента
     */
    methods._getImagePcContent = function() {
        return $("#imagePcContent").tmpl();
    };
    /**
     * Показываем окно для выбора способа загрузки изображений
     */
    methods._loadImagesPrevHandlerForImagePcContent = function() {
        this._getLoadImagesContent().replaceAll('#load-images-content');
        this._setLoadImagesEvents();
        $.fancybox.update();
        $.fancybox.reposition();
    };
    /**
     * Загружаем картинки из компьютера
     */
    methods._wpImagesPhotosHolderChangeHandler = function() {console.log(1);
        this.photosHolder.wpPhotos("option", "load_image_btn").detach();
        $.fancybox.close();
    };
    /**
     * Устанавливаем события для элементов в окне imagePc
     */
    methods._setImagePcEvents = function() {
        $('#load-images-prev').on('click', this._proxy("_loadImagesPrevHandlerForImagePcContent"));
        $('#load-images-close').on('click', this._proxy("_loadImagesCloseHandler"));
        
        this.photosHolder.wpPhotos("option", "load_image_btn").appendTo("#load-images-image_pc");
        this.photosHolder.wpPhotos("option", "change", this._proxy("_wpImagesPhotosHolderChangeHandler"));
    };
    /**
     * Сохраняем все фотоальбомы в наш массив
     * @param {Object} json
     */
    methods._getPhotoAlbumsImagesOnSuccess = function(json) {
        this._photoAlbums = json.albums;
    };
    /**
     * Сообщаем пользователю об ошибке, при получении всех фотоальбомов
     * @param {Object} xhr
     * @param {number} status
     */
    methods._getPhotoAlbumsImagesOnError = function(xhr, status) {
        this.errorMessage(xhr.responseText);
    };
    /**
     * Разрешаем выполнять новые запросы аякса после получения всех фотоальбомов
     * @param {Object} xhr
     * @param {number} status
     */
    methods._getPhotoAlbumsImagesOnComplete = function(xhr, status) {
        this._denyAjax = false;
    };
    
    /**
     * Формируем представление для всех фотоальбомов. В случае необходимости посылаем запрос на сервер.
     * @returns {jQuery}
     */
    methods._getPhotoAlbumsImages = function() {
        if (typeof this._getPhotoAlbumsImagesDefObj == "undefined") {
            if (this._denyAjax) {
                return false;
            }
            this._denyAjax = true;
            
            this._getPhotoAlbumsImagesDefObj = $.ajax({
                url: this.baseUrl+'/'+this.nodeName+'/albums_json',
                dataType: 'json',
                context: this,
                success: this._getPhotoAlbumsImagesOnSuccess,
                error: this._getPhotoAlbumsImagesOnError,
                complete: this._getPhotoAlbumsImagesOnComplete
            });
        }
        return this._getPhotoAlbumsImagesDefObj;
    };
    /**
     * Получим страничку для всех фотоальбомов. В случае необходимости посылаем запрос на сервер.
     * @returns {jQuery}
     */
    methods._getPhotoAlbumsImagesContent = function() {
        return $("#photoAlbumsImagesContent").tmpl({
            photoAlbums: this._photoAlbums
            , baseUrl: this.baseUrl
            , nodeName: this.nodeName
        });
    };
    /**
     * Показываем окно для выбора способа загрузки изображений
     */
    methods._loadImagesPrevHandlerForPhotoAlbumsImagesContent = function() {
        this._getLoadImagesContent().replaceAll('#load-images-content');
        this._setLoadImagesEvents();
        $.fancybox.update();
        $.fancybox.reposition();
    };
    /**
     * Показываем окно для выбора картинки из конкретного фотоальбома
     */
    methods._loadImagesPhotoAlbumsLinkHandler = function(event) {
        var photo_album_key_active = event.currentTarget.id.substring(event.currentTarget.id.lastIndexOf('-') + 1);
        this._getPhotoAlbumPhotosContent(photo_album_key_active).replaceAll('#load-images-content')
        this._setPhotoAlbumPhotosEvents(photo_album_key_active)
        $.fancybox.update();
        $.fancybox.reposition();
    };
     /**
     * Устанавливаем события для элементов в окне photoAlbumsImages
     */
    methods._setPhotoAlbumsImagesEvents = function() {
        $('#load-images-prev').on('click', this._proxy("_loadImagesPrevHandlerForPhotoAlbumsImagesContent"));
        $('#load-images-close').on('click', this._proxy("_loadImagesCloseHandler"));
        $('#load-images-photo_albums-list a.load-images-photo_albums-link').on('click', this._proxy("_loadImagesPhotoAlbumsLinkHandler"));
    };
    /**
     * Получим страничку с картинками конкретного фотоальбома.
     * @returns {jQuery}
     */
    methods._getPhotoAlbumPhotosContent = function(key) {
        return $("#photoAlbumPhotosContent").tmpl({
            photoAlbum: this._photoAlbums[key]
            , key: key
            , baseUrl: this.baseUrl
            , nodeName: this.nodeName            
        });
    };
    /**
     * Показываем окно с фотоальбомами
     */
    methods._loadImagesPrevHandlerForPhotoAlbumPhotosContent = function() {
        if (this._getPhotoAlbumsImages() == undefined) {
            return;
        }
        this._getPhotoAlbumsImages().done(function() {
            this._getPhotoAlbumsImagesContent().replaceAll('#load-images-content');
            this._setPhotoAlbumsImagesEvents();
            $.fancybox.update();
            $.fancybox.reposition();
        });            
    };
    /**
     * Загружаем картинку из своего хранилища 
     * @param {event} event
     */
    methods._loadImagesPhotoAlbumPhotosLinkHandler = function(event) {
        var photo = this._photoAlbums[event.data.key].images[event.data.i];
        this.photosHolder.wpPhotos('addPhoto', photo);

        $.fancybox.close();
    };
    /**
     * Подписываем события для элементов в окне photoAlbumPhotos
     */
    methods._setPhotoAlbumPhotosEvents = function(key) {
        $('#load-images-prev').on('click', this._proxy("_loadImagesPrevHandlerForPhotoAlbumPhotosContent"));
        $('#load-images-close').on('click', this._proxy("_loadImagesCloseHandler"));
        if (this._photoAlbums[key]) {
            for (var i in this._photoAlbums[key].images) {
                $('#load-images-photo_album-photos-link-' + i + '_' + key + '').on('click', {key: key, i: i}, this._proxy("_loadImagesPhotoAlbumPhotosLinkHandler"));
            }
        }
    };
    /**
     * Зарегистрируем наш объект в плагинах jQuery
     */
    addJqueryPlugin(UlImages, JQUERY_PLUGIN_NAME);
    
    return UlImages;
});
