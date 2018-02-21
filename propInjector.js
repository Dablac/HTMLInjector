function injectorElement(fnNoID, fnSetID, logging){
    this.logging = logging;
    this.noID = fnNoID;
    this.setID = fnSetID;
    this._setParent = parentID => this._parent = parentID;
    this._setIsBase = isBase => this._isBase = isBase;
    this._setHasClones = hasClones => this._hasClones = hasClones;
    this._setCloneIndex = index => this._cloneIndex = index;
    this.split = function(affix){
        if (this.logging) console.log(this);
        this._isNonElementContent = !affix.includes('<');
        this._unaltered = affix;
        //this._tagName = affix.split('<').join('').split(' ')[0];
        this._tagName = /([a-zA-Z]+)/.exec(affix)[0];
        this._openingTag = `<${this._tagName} `;
        this._attributes = affix.replace(`<${this._tagName}`, '').split('>')[0];
        var noIdSelectorAffix = affix.replace(/\[id=/gi, '');
        if (noIdSelectorAffix.includes('id=')){
            this.id = noIdSelectorAffix.replace('<'+this._tagName, '').split('>')[0].split('id=')[1].slice(1).split(' ')[0].slice(0, -1);
            var g = this._attributes.split(this.id);
            this._attributes = g[0].slice(0, -4)+g[1].slice(1);
            if (this._hasClones) this.id += '_'+this._cloneIndex;
            this._ID = this.setID(this.id);
        }else this._ID = this.noID();
        this._closingTag = `</${this._tagName}>`;
        this._children = [];
        this._alreadyStringed = false;
        var possibleChild = affix.split(this._closingTag)[0].split('>')[1];
        if (!!possibleChild) this._children.push(possibleChild);
    };
    this.ascb = (children, string3) => children.map((child, i)=>string3[i] = child instanceof injectorElement ? child.assembleString(this.ascb) : child);
    this.assembleString = ()=>{
        if (this._alreadyStringed) return '';
        var result = '';
        if (this._isNonElementContent) result = this._unaltered; else{
            var string = [this._openingTag, `id="${this._ID}" data-id="${this.id}"`, `${this._attributes}>`, [], this._closingTag];
            this.ascb(this._children, string[3]);
            result = string.join('');
        }
        this._alreadyStringed = true;
        return result;
    };
}

var lastCycleIndex = 0;
var cGenIndex = 0;
var sGenIndex = 0;

function* cGen(coefficientArray, cycleIndex, logging) {
    if (cycleIndex !== lastCycleIndex){ cGenIndex = 0; lastCycleIndex = cycleIndex; }
    if (cGenIndex < coefficientArray.length){
        if (coefficientArray[cGenIndex].constructor === Array) yield (cycleIndex+coefficientArray[cGenIndex][1]) * coefficientArray[cGenIndex++][0]; else yield (cycleIndex+1) * coefficientArray[cGenIndex++];
    } else {
        if (logging) console.log("Iterated element multiplying coefficient array (%o) length (%o) does not contain as many values as the index of the replacement being requested (%o).", coefficientArray, coefficientArray.length, cGenIndex);
    }
}

function* sGen(stringArray, cycleIndex, logging) {
    if (cycleIndex !== lastCycleIndex){ sGenIndex = 0; lastCycleIndex = cycleIndex; }
    if (sGenIndex < stringArray.length) yield stringArray[sGenIndex++]; else {
        if (logging) console.log("Iterated element string array (%o) length (%o) does not contain as many values as the index of the replacement being requested (%o).", stringArray, stringArray.length, sGenIndex);
    }
}

function Injector(UID, _defaultId, logging){
    this.UID = UID+'_';
    this.defaultID = !_defaultId ? 'noDefaultId' : _defaultId;
    this.defaultIDIndex = 0;
    this.logging = logging;
    this.setID = id => this.UID+id;
    this.noID = () => this.setID(this.defaultID+'_'+this.defaultIDIndex++);
    this.default = index => this.setID(this.defaultID+'_'+index);
    this.propList = {};
    this._setAllChildren = array => array.forEach((element, i, arr)=>{
        arr.forEach(e=>{if (e._parent === element._ID){
            element._children.push(e);
            if (!this.propList[element.id]) this.propList[element.id] = [e.id]; else this.propList[element.id].push(e.id);
        }});
    });
    this.addBase = function(affix, quantity, coefficients, strings){
        var number = quantity || 1;
        var hasClones = number > 1 ? true : false;
        for (var i = 0; i < number; i++){
            this._add(true, 'existing HTML', hasClones, i, affix.replace(/MULT|STRING/g, function(match, p1, p2){
                if (p1) return cGen(coefficients, i, this.logging).next().value;
                if (p2) return sGen(strings, i, this.logging).next().value;
            }));
        }
    };
    this.addChild = function(parent, affix, quantity, coefficients, strings){
        var number = quantity || 1;
        var hasClones = number > 1 ? true : false;
        for (var i = 0; i < number; i++){
            this._add(false, parent, hasClones, i, affix.replace(/MULT|STRING/g, function(match){
                if (match === 'MULT') return cGen(coefficients, i).next().value;
                if (match === 'STRING') return sGen(strings, i).next().value;
            }));
        }
    };
    this._add = function(isBase, parent, hasClones, cloneIndex, affix){
        var e = new injectorElement(this.noID.bind(this), this.setID.bind(this));
        if (parent !== 'existing HTML'){ if (parent.includes(this.UID)) e._setParent(parent); else e._setParent(this.setID(parent)); }
        e._setIsBase(isBase);
        e._setHasClones(hasClones);
        e._setCloneIndex(cloneIndex);
        e.split(affix);
        this[e._ID] = e;
    };
    this._elementArray = () => Object.keys(this).reduce((iEs, key) => this[key] instanceof injectorElement ? [...iEs, this[key]] : iEs, []);
    this._assignProps = element => {
        if (!!this.propList[element.dataset.id]) this.propList[element.dataset.id].forEach(idStr=>{
            element[idStr] = element.children[this.setID(idStr)];
            this._assignProps(element[idStr]);
        });
    };
    this._returnBases = function(baseIds){
        var bases = [];
        for (var i = 0; i < baseIds.length; i++){
            let currentBase = document.getElementById(baseIds[i]);
            this._assignProps(currentBase);
            bases.push(currentBase);
        }
        if (this.logging) console.log('[%o]_returnBases(%o): %o', this, baseIds, bases);
        return bases;
    };
    this.inject = function(setPosition, altTarget){
        var target = altTarget || 'body';
        //  ↑ 'head' (string) | Element (object)
        var position = setPosition || 'beforeEnd';
        //  ↑ 'afterEnd' | 'beforeBegin' | 'afterBegin'
        if (!(position === 'beforeEnd' || position === 'afterEnd' || position ===  'beforeBegin' || position ===  'afterBegin')) position = 'beforeEnd';
        var iEs = this._elementArray();
        if (this.logging) console.log('injectorElements=%o', iEs);
        this._setAllChildren(iEs);
        var baseIds = [];
        var fullString = '';
        for (var i in iEs){
            var result = '';
            if (iEs[i]._isBase){
                baseIds.push(iEs[i]._ID);
                result = iEs[i].assembleString();
                if (!!result) fullString += result;
            }
        }
        var finishedString = fullString.replace(/(\,<)|(}\,)/gi, function(match, p1, p2){ if (p1) return '\n\n <'; if (p2) return '} \n\n'; });
        if (target.constructor === String) document[target].insertAdjacentHTML(position, finishedString); else target.insertAdjacentHTML(position, finishedString);
        return this._returnBases(baseIds);
    };
}
