function injectorElement(fnNoID){
    this.noID = fnNoID;
    this._setParent = function(parentID){
        this._parent = parentID;
    };
    this._setIsBase = function(input){
        this._isBase = input;
    };
    this.split = function(affix){
        this._isNonElementContent = !affix.includes('<');
        this._unaltered = affix;
        //this._tagName = affix.split('<').join('').split(' ')[0];
        this._tagName = /([a-zA-Z]+)/.exec(affix)[0];
        this._openingTag = '<'+this._tagName+' ';
        this._attributes = affix.replace('<'+this._tagName, '').split('>')[0];
        var noIdSelectorAffix = affix.replace(/\[id=/gi, '');
        if (noIdSelectorAffix.includes('id=')){
            this._ID = noIdSelectorAffix.replace('<'+this._tagName, '').split('>')[0].split('id=')[1].slice(1).split(' ')[0].slice(0, -1);  
            var g = this._attributes.split(this._ID);
            this._attributes = g[0].slice(0, -4)+g[1].slice(1);
        }else this._ID = this.noID();
        this._closingTag = '</'+this._tagName+'>';
        this._children = [];
        this._alreadyStringed = false;
        var possibleChild = affix.split(this._closingTag)[0].split('>')[1];
        if (!!possibleChild) this._children.push(possibleChild);
    };
    this.assembleString = function(assembleCallback){
        if (this._alreadyStringed) return '';
        var result = '';
        if (this._isNonElementContent) result = this._unaltered; else{
            var string = [this._openingTag, "id='"+this._ID+"'", this._attributes+'>', [], this._closingTag];
            assembleCallback(this._children, string[3]);
            result = string.join('');
        }
        this._alreadyStringed = true;
        return result;
    };
}

function setChildren(element, elements){Array.prototype.slice.call(elements).forEach(function(e, i, a){ if (e._parent === element._ID) element._children.push(e); }); }

var cGenIndex = 1;
var lastCycleIndex = 0;
function* cGen(coefficientArray, cycleIndex, offset) {
    if (cycleIndex !== lastCycleIndex){ cGenIndex = 1; lastCycleIndex = cycleIndex; }
    if (cGenIndex < coefficientArray.length) yield cycleIndex * coefficientArray[offset+cGenIndex++]; else {
    console.log("Iterated element multiplying coefficient array (%o) length (%o) does not contain as many values as the index of the replacement being requested (%o).", coefficientArray, coefficientArray.length, (offset+cGenIndex));
    }
}

function Injector(defaultID){
    this.defaultID = defaultID;
    this.defaultIDIndex = 0;
    this.noID = function(){
        return this.defaultID+'_'+this.defaultIDIndex++;
    };
}
Injector.prototype = {
    _setAllChildren: function(array){
        array.map(function(e, i, a){ setChildren(e, a); });
    },
    addBase: function(affix, quantity){
        var number = quantity || 1;
        for (var i = 0; i < number; i++){
            this._add(true, 'existing HTML', affix); 
        }
    },
    addChild: function(parent, affix, quantity, coefficients, offset){
        var number = quantity || 1;
        for (var i = 0; i < number; i++){
            this._add(false, parent, affix.replace(/MULT/g, function(){return cGen(coefficients, i, offset).next().value; })); 
        }
    },
    _add: function(isBase, parent, affix){
        var e = new injectorElement(this.noID.bind(this));
        e._setParent(parent);
        e._setIsBase(isBase);
        e.split(affix);
        console.log(this);
        this[e._ID] = e;
    },
    _elementArray: function(){
        var x = [];
        for (var prop in this){ if (this[prop] instanceof injectorElement) x.push(this[prop]); }
        return x;
    },
    _returnBases: function(baseIds){
        console.log('_returnBases: function(%o)', baseIds);
        var bases = [];
        for (var i = 0; i < baseIds.length; i++){
            bases.push(document.getElementById(baseIds[i]));
        }
        return bases;
    },
    inject: function(setPosition, altTarget){
        var target = altTarget || 'body'; 
        //  ↑ 'head' (string) | Element (object)
        var position = setPosition || 'beforeEnd'; 
        //  ↑ 'afterEnd' | 'beforeBegin' | 'afterBegin'
        if (!(position === 'beforeEnd' || position === 'afterEnd' || position ===  'beforeBegin' || position ===  'afterBegin')) position = 'beforeEnd';
        var iEs = this._elementArray();
        this._setAllChildren(iEs);
        var baseIds = [];
        var fullString = '';
        for (var i in iEs){
            var result = '';
            if (iEs[i]._isBase){
                baseIds.push(iEs[i]._ID);
                result = iEs[i].assembleString(assembleStringCallback);
                if (!!result) fullString += result;
            }
        }
        var finishedString = fullString.replace(/(\,<)|(}\,)/gi, function(match, p1, p2){ if (p1) return '\n\n <'; if (p2) return '} \n\n'; });
        if (target.constructor === String) document[target].insertAdjacentHTML(position, finishedString); else target.insertAdjacentHTML(position, finishedString);
        return this._returnBases(baseIds);
    }
};

function assembleStringCallback(children, string){
    for (var x = 0; x < children.length; x++){ 
        if (children[x] instanceof injectorElement) string[x] = children[x].assembleString(assembleStringCallback); else string[x] = children[x];
    }
    return string;
}
