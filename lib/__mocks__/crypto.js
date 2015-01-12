var myHash;
module.exports = {
    randomBytes: function(numBytes, callback){
        callback(undefined, 'abcd_randombytes_test')
    },
    createHash: function(){
        return {
            update: function(){},
            digest: function(){
                return myHash || 'abcd_createhash_test';
            }
        }
    },
    setMyHash: function(newHash){
        myHash = newHash;
    }
};