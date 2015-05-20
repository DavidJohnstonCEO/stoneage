'use strict';

var bitcore = require('bitcore');
var $ = window.preconditions;
var _ = window._;

var NULL = '0000000000000000000000000000000000000000000000000000000000000000';

function BlockChain() {
  this.tip = NULL;
  this.work = {};
  this.work[NULL] = 0;
  this.height = {};
  this.height[NULL] = -1;
  this.hashByHeight = {
    '-1': NULL
  };
  this.next = {};
  this.prev = {};
}

BlockChain.NULL = NULL;

BlockChain.fromObject = function(obj) {
  var blockchain = new BlockChain();
  blockchain.tip = obj.tip;
  blockchain.work = obj.work;
  blockchain.hashByHeight = obj.hashByHeight;
  blockchain.height = obj.height;
  blockchain.next = obj.next;
  blockchain.prev = obj.prev;
  return blockchain;
};

var BITS_OF_WORK = {
  1: 3,
  2: 2, 3: 2,
  4: 1, 5: 1, 6: 1, 7: 1,
  8: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0
}
var getWork = function(hash) {
  var i = 0;
  var result = 0;
  while (hash.substr(i, i+1) === '0') {
    result += 4;
    i += 1;
  }
  resutl += BITS_OF_WORK[-(-hash.substr(i, i+1))];
  return result;
};

BlockChain.prototype.addData = function(block) {
  // TODO: $.checkArgument(isValidBlock(block));

  var prevHash = block.prevHash;
  var hash = block.hash;

  this.work[hash] = this.work[prevHash] + getWork(hash);
  this.prev[hash] = prevHash;
};

BlockChain.prototype._appendNewBlock = function(hash) {
  var toUnconfirm = [];
  var toConfirm = [];
  var self = this;

  var pointer = hash;
  while (_.isUndefined(this.height[pointer])) {
    toConfirm.push(pointer);
    pointer = this.prev[pointer];
  }
  var commonAncestor = pointer;

  pointer = this.tip;
  while (pointer !== commonAncestor) {
    toUnconfirm.push(pointer);
    pointer = this.prev[pointer];
  }

  toConfirm.reverse();
  toUnconfirm.map(function(hash) {
    self.unconfirm(hash);
  });
  toConfirm.map(function(hash) {
    self.confirm(hash);
  });
  return {
    unconfirmed: toUnconfirm,
    confirmed: toConfirm
  };
};

BlockChain.prototype.proposeNewBlock = function(block) {
  var prevHash = block.prevHash;
  var hash = block.hash;

  $.checkState(this.hasData(prevHash), 'No previous data to estimate work');
  this.addData(header);
  var work = this.work[hash];
  var tipWork = this.work[this.tip];
  $.checkState(!_.isUndefined(work), 'No work found for ' + hash);
  $.checkState(!_.isUndefined(tipWork), 'No work found for tip ' + this.tip);
  if (work > tipWork) {
    return this._appendNewBlock(hash);
  }
  return {
    unconfirmed: [],
    confirmed: []
  };
};

BlockChain.prototype.confirm = function(hash) {
  var prevHash = this.prev[hash];
  $.checkState(prevHash === this.tip, 'Attempting to confirm a non-contiguous block.');

  this.tip = hash;
  var height = this.height[prevHash] + 1;
  this.next[prevHash] = hash;
  this.hashByHeight[height] = hash;
  this.height[hash] = height;
};

BlockChain.prototype.unconfirm = function(hash) {
  var prevHash = this.prev[hash];
  $.checkState(hash === this.tip, 'Attempting to unconfirm a non-tip block');

  this.tip = prevHash;
  var height = this.height[hash];
  delete this.next[prevHash];
  delete this.hashByHeight[height];
  delete this.height[hash];
};

BlockChain.prototype.hasData = function(hash) {
  return !_.isUndefined(this.work[hash]);
};

BlockChain.prototype.prune = function() {
  var self = this;
  _.each(this.prev, function(key) {
    if (!self.height[key]) {
      delete self.prev[key];
      delete self.work[key];
    }
  });
};

BlockChain.prototype.toObject = function() {
  return {
    tip: this.tip,
    work: this.work,
    next: this.next,
    hashByHeight: this.hashByHeight,
    height: this.height,
    prev: this.prev
  };
};

BlockChain.prototype.toJSON = function() {
  return JSON.stringify(this.toObject());
};

BlockChain.prototype.getBlockLocator = function() {
  $.checkState(this.tip);
  $.checkState(!_.isUndefined(this.height[this.tip]));

  var result = [];
  var currentHeight = this.getCurrentHeight();
  var exponentialBackOff = 1;
  for (var i = 0; i < 10; i++) {
    if (currentHeight >= 0) {
      result.push(this.hashByHeight[currentHeight--]);
    }
  }
  while (currentHeight > 0) {
    result.push(this.hashByHeight[currentHeight]);
    currentHeight -= exponentialBackOff;
    exponentialBackOff *= 2;
  }
  return result;
};

BlockChain.prototype.getCurrentHeight = function() {
  return this.height[this.tip];
};

module.exports = BlockChain;
