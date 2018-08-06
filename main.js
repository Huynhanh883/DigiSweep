"use strict";
(function(window,document,undefined){
	var MAX_REQUESTS=4;														//max number of concurent requests to explorer server
	var TX_FEE_KB=0.0002;													//fee amount per kb
	var SEND_MIN=0.0007;													//minimum amount that can be sent to an address
	var digibyte=require('digibyte');										//load digibyte object.  should check digibyte.min.js has not been edited since last confirmation of good standing
	digibyte.Transaction.FEE_PER_KB=TX_FEE_KB*100000000;

	
	
/*     _  _____  ____  _   _   _____                            _   
      | |/ ____|/ __ \| \ | | |  __ \                          | |  
      | | (___ | |  | |  \| | | |__) |___  __ _ _   _  ___  ___| |_ 
  _   | |\___ \| |  | | . ` | |  _  // _ \/ _` | | | |/ _ \/ __| __|
 | |__| |____) | |__| | |\  | | | \ \  __/ (_| | |_| |  __/\__ \ |_ 
  \____/|_____/ \____/|_| \_| |_|  \_\___|\__, |\__,_|\___||___/\__|
                                             | |                    
                                             |_|   
This is most dangerous part of script because it is the only part of code that connects to the internet.
Things to look for to make sure code is legit:
1) Make sure no other function accesses the internet.  Search code for XML and $. should not be anywhere else in code
2) Make sure url portion listed after req['open'] points to trust worthy server and uses https(digiexplorer.info is official digibyte server)
3) Make sure no part of code trys to send or save the private keys(signing message and calculating public address with them is ok)
*/

	var postJSON=function(url,data) {
		return new Promise(function(resolve,reject) {					//return promise since execution is asyncronous
			var server=document.getElementById('server').value;
			console.log("server being used: "+server);
			var req = new XMLHttpRequest();								//setup http request
			req['open']('POST', server+url,true);	//set url of file to get
			req['setRequestHeader']("Content-Type", "application/json");//show using json
			req['onload'] = function() {								//run when data is returned
				if (req['status'] == 200) {								//make sure no error code wasn't returned
					var data=JSON['parse'](req['response']);			//decode returned string into json data
					if (data===null) {									//check if data was valid json data
						reject({										//reject the promise because there was an error
							error:		500,							//return error code(use 500 for misilaneous errors)
							message:	req['response']					//return error message
						});
					} else {											//data was valid
						resolve(data);									//resolve the promise
					}
				} else {												//error code wasn't 200 so soething when wrong
					reject({											//reject the promise because there was an error
						error:		req.status,							//return error code
						message:	"Unexpected Error"					//return error message
					});
				}
			}
			req['onerror'] = function() {								//handle network errors that may result in data not being returned
				reject({												//reject the promise because there was an error
					error:	500,										//return error code(use 500 for misilaneous errors)
					message:	"Network Error"							//return error message
				});
			};
			req['send'](JSON.stringify(data));							//convert data to string and send to server
		});
	}

	var getJSON=function(urlORurls) {
		return new Promise(function(resolve, reject) {					//return promise since execution is asyncronous
			var server=document.getElementById('server').value;
			console.log("server being used: "+server);
			
			if (typeof urlORurls=="string") {							//if received string then return the promise for just this request
				var req = new XMLHttpRequest();							//setup http request
				
				req['open']('GET', server+urlORurls);	//set url of file to get
				req['onload'] = function() {							//run when data is returned
					if (req['status'] == 200) {							//make sure no error code wasn't returned
						var data=JSON['parse'](req['response']);		//decode returned string into json data
						if (data===null) {								//check if data was valid json data
							reject({									//reject the promise because there was an error
								error:		500,						//return error code(use 500 for misilaneous errors)
								message:	req['response']				//return error message
							});
						} else {										//data was valid
							resolve(data);								//resolve the promise
						}
					} else {											//error code wasn't 200 so soething when wrong
						reject({										//reject the promise because there was an error
							error:		req.status,						//return error code
							message:	"Unexpected Error"				//return error message
						});
					}
				};
				req['onerror'] = function() {							//handle network errors that may result in data not being returned
					reject({											//reject the promise because there was an error
						error:	500,									//return error code(use 500 for misilaneous errors)
						message:	"Network Error"						//return error message
					});
				};
				req['send']();											//send request for data
			} else {
				var responses={};										//keep track of responses
				var responsCount=0;
				var index=0;											//keep track of current request
				var getNext=function(i) {
					if (i<urlORurls.length) {							//make sure there are still requests left to process
						getJSON(urlORurls[i]).then(function(responseData){//make request
							responsCount++;
							responses[urlORurls[i]]=responseData;		//store response
							getNext(index++);							//request the next next index and update value
						},reject);										//if request failed then fail entire series
					}
					if (responsCount==urlORurls.length) {			//check if we have as many responses as requests
						resolve(responses);								//resolve the promise and return the responses
					}
				}
				for (var i=0;i<MAX_REQUESTS;i++) {						//start up to MAX_REQUEST concurrent requests
					getNext(index++);									//request the next next index and update value
				}
			}
		});			
	}

	
	
/*_          ___           _                  _____           _                 
 \ \        / (_)         | |                / ____|         | |                
  \ \  /\  / / _ _ __   __| | _____      __ | (___  _   _ ___| |_ ___ _ __ ___  
   \ \/  \/ / | | '_ \ / _` |/ _ \ \ /\ / /  \___ \| | | / __| __/ _ \ '_ ` _ \ 
    \  /\  /  | | | | | (_| | (_) \ V  V /   ____) | |_| \__ \ ||  __/ | | | | |
     \/  \/   |_|_| |_|\__,_|\___/ \_/\_/   |_____/ \__, |___/\__\___|_| |_| |_|
                                                     __/ |                      
                                                    |___/ 
*/
	var domShadow=document['getElementById']('shadow');
	var closeWindows=function(shadow) {
		var windows=document['getElementsByClassName']('window');				//get all windows
		for (var i=0; i<windows['length']; i++) {								//go through each window
			windows[i]['style']['display']='none';								//make window invisible
		}
//		tempQRLayer=undefined;
		if (shadow===true) domShadow['style']['display']='none';				//close shadow if set
	}
	var openWindow=function(windowType) {
		closeWindows();															//close all windows
		document['getElementById']("window_"+windowType)['style']['display']='block';//open the window associated with button pressed
		domShadow['style']['display']='block';									//open shadow
	}
			
	
	
/*____             _         ___   _           _     ____        _   _              
 |  _ \           | |       / / \ | |         | |   |  _ \      | | | |             
 | |_) | __ _  ___| | __   / /|  \| | _____  _| |_  | |_) |_   _| |_| |_ ___  _ __  
 |  _ < / _` |/ __| |/ /  / / | . ` |/ _ \ \/ / __| |  _ <| | | | __| __/ _ \| '_ \ 
 | |_) | (_| | (__|   <  / /  | |\  |  __/>  <| |_  | |_) | |_| | |_| || (_) | | | |
 |____/ \__,_|\___|_|\_\/_/   |_| \_|\___/_/\_\\__| |____/ \__,_|\__|\__\___/|_| |_|
	 
	To use add clickable item to dom with 
		class="next"
		page="pages div id"
		val="optional string to send to function"
		
	Add a div with class="page" to represent the page data
	If you want code to be executed when the button is clicked add
	$PAGE["page_div_id"]={
		valid: function(val) {
			//return true if should go through, error message if should not
		}, 
		load: function(val) {
			//code goes here on page loaded by next button
		},
		reload: function(val) {
			//code goes here on page loaded by back button
		}
	}
	
	
 */
	var domNext=document.getElementsByClassName("next");				//get all dom items using class next
	var domBack=document.getElementsByClassName("back");				//get all dom items using class next
	var domPage=document.getElementsByClassName("page");				//get all dom items using class page
	var $PAGE=[];														//make up an array for page functions
	var loadPage=function(page) {										//function to be executed when something with class "next" is clicked
		var val,next=true,emptyFunc=function(){return true;};												//define default values if being called directly
		if (typeof page!="string") {									//if page is not a string then it is called by a link so get values
			page=this.getAttribute("page");								//get next page name
			val=this.getAttribute("val");								//get optional link value to pass to functions
			next=(this.getAttribute("class")=="next");					//see if moving forward or backwards
		}
		var pageCode=$PAGE[page]||{};									//get page code object if doesn't exist create an empty one
		if (next) {														//see if moving to next page because we don't validate fields on back
			var loaded=(pageCode.valid||emptyFunc)(val);				//see if there was an error validating inputs
			if (loaded!==true) {
				console.log("Error Validating: ",loaded);				//show error in log  **** make prettier later
				return false;											//bomb out of function so we don't load page
			}
		}
		var loaded=((next?pageCode.load:pageCode.reload)||emptyFunc)(val);//executes page code if exists
		if (loaded!==true) {
			console.log("Error Loading: ",loaded);						//show error in log  **** make prettier later
			return false;												//bomb out of function so we don't load page
		}
		for (var i=0; i<domPage.length; i++) 							//go through each element with class "page"
			domPage[i].style.display = 'none';						//hide them
		document.getElementById(page).style.display = 'block';		//make desired page visible
	};
	for (var i=0; i<domNext.length; i++) {								//go through each dom element with class "next"
		domNext[i].addEventListener('click', loadPage, false);			//attach click listener to execute loadPage function
	}
	for (var i=0; i<domBack.length; i++) {								//go through each dom element with class "back"
		domBack[i].addEventListener('click', loadPage, false);			//attach click listener to execute loadPage function
	}

	

	
/*___ _____ _____ ____ ___      ______ _____ _____ ____   ___     _____                              _   
 |  _ \_   _|  __ \___ \__ \    / /  _ \_   _|  __ \___ \ / _ \   / ____|                            | |  
 | |_) || | | |__) |__) | ) |  / /| |_) || | | |__) |__) | (_) | | (___  _   _ _ __  _ __   ___  _ __| |_ 
 |  _ < | | |  ___/|__ < / /  / / |  _ < | | |  ___/|__ < \__, |  \___ \| | | | '_ \| '_ \ / _ \| '__| __|
 | |_) || |_| |    ___) / /_ / /  | |_) || |_| |    ___) |  / /   ____) | |_| | |_) | |_) | (_) | |  | |_ 
 |____/_____|_|   |____/____/_/   |____/_____|_|   |____/  /_/   |_____/ \__,_| .__/| .__/ \___/|_|   \__|
                                                                              | |   | |                   
                                                                              |_|   |_|   
*/	
var BIP32_BLOCKS=20;
var getBip32UsedKeys=function(phrase,derivative,outputNum) {
	return new Promise(function(resolve,reject) {					//return promise since execution is asyncronous
		var data={};
		var i=0-BIP32_BLOCKS;
		var getBlock=function() {
			i+=BIP32_BLOCKS;													//update to get next 40 keys on next pass
			document.getElementById('bip39_block'+outputNum).innerHTML='Scanning: '+derivative+'/' + i + ' to ' + derivative +'/'+(i+BIP32_BLOCKS);
			var keys=bip32(phrase,derivative,i,BIP32_BLOCKS);				//get next 40 keys
			
			//make list of public/private keys so easy to keep track
			var req=[];											
			for (var ii in keys) {								//go through each private key and look up its value
				var keySet=keys[ii];
				data[keySet[0]]={
					"pub":keySet[0],
					"pri":keySet[1],
					"bal":0,
					"txs":0,
					"index":i+ii
				};
				req.push("addr/"+keySet[0]);							//lookup public address and get its balance
			}
			
			//execute request
			getJSON(req).then(function(res) {
				var last=-1;										//way to find end of sequenze
				for (var url in res) {
					var addressData=res[url];
					data[addressData["addrStr"]]["bal"]=addressData["balanceSat"];
					data[addressData["addrStr"]]["txs"]=addressData["txApperances"];
					if (addressData["txApperances"]>0) last=data[addressData["addrStr"]]["index"];
				}
				
				//data.push(pub,pri,balance);
				
				if(last!=-1){
					getBlock();
				} else {
					resolve(data);
				}
			},reject);
		}
		getBlock();
	});
}
	
	
	
	
	
	
	
	
	
	
	
	
/*_  __                _____                 
 | |/ /               |  __ \                
 | ' / ___ _   _ ___  | |__) |_ _  __ _  ___ 
 |  < / _ \ | | / __| |  ___/ _` |/ _` |/ _ \
 | . \  __/ |_| \__ \ | |  | (_| | (_| |  __/
 |_|\_\___|\__, |___/ |_|   \__,_|\__, |\___|
            __/ |                  __/ |     
           |___/                  |___/ 
*/
	
	
	

	
/*____        _                        _____                 
 |  _ \      | |                      |  __ \                
 | |_) | __ _| | __ _ _ __   ___ ___  | |__) |_ _  __ _  ___ 
 |  _ < / _` | |/ _` | '_ \ / __/ _ \ |  ___/ _` |/ _` |/ _ \
 | |_) | (_| | | (_| | | | | (_|  __/ | |  | (_| | (_| |  __/
 |____/ \__,_|_|\__,_|_| |_|\___\___| |_|   \__,_|\__, |\___|
                                                   __/ |     
                                                  |___/ 
*/	
	var isSeedPhrase;
	var privateKeys;													//initialise private key list(never leaves this page or stored)
	var fundsTotal=0;													//total funds available
	var utxos;															//utxo list
	$PAGE["pageBalances"]={
		valid: function() {											//function executes to validate key inputs returns false if no errors.
			isSeedPhrase=false;											//initialise seed phrase check
			privateKeys=document.getElementById("wif").value;			//get what user typed into input box
			privateKeys=privateKeys.replace(/\s/g,",");					//replace all white space with ,
			privateKeys=privateKeys.split(",").filter(function(e){return e});//split up into array of keys and remove duplicates
			if ((privateKeys.length%6==0)&&(privateKeys.length>11)) {	//find if 12,18,24,...
				if (privateKeys[0].length<20) {							//check if short word or long private key
					isSeedPhrase=true;									//is likely seed phrase
					return true;										//mark as valid because don't have validity check yet
				}
			}
			for (var key of privateKeys) {								//go through list of keys and see if they are all valid
				if (!digibyte.PrivateKey.isValid(key)) 					//looks to see if key is valid
					return "Invalid Private Key: "+key;					//if not valid then return error message(doesn't bother checking rest of keys)
			}
			return true;												//no errors found so return false
		},
		load: function() {											//function executes when page is loaded by next button
			var finish=function() {
				openWindow("bal");
				document.getElementById("keyCount").innerHTML=privateKeys.length;	//show how many keys there are to search
				var html='<div class="balanceRow"><div class="balanceHead">Addresses</div><div class="balanceHead">Value</div></div>';
				var reqs=[];
				utxos=undefined;											//set utxos to undefined so we have easy way to know when loaded
				for (var key of privateKeys) {								//go through each private key and look up its value
					reqs.push("addr/"+digibyte.PrivateKey.fromString(key).toAddress().toString());	//compute public address from private key and create api call to get its balance
				}
				getJSON(reqs).then(function(reqResponses) {					//request the value of each address
					fundsTotal=0;											//initialise funds total varible
					var reqs=[];											//initialise utxo request list
					for (var url in reqResponses) {							//go through each response and get the url requested
						var addressData=reqResponses[url];					//get the particular urls response
						var from=addressData["addrStr"];					//get address balance is from
						html+='<div class="balanceRow"><div class="balanceCellAddress">'+from+'</div><div class="balanceCellValue">'+addressData["balance"].toFixed(8)+' DGB</div></div>';	//create table row
						fundsTotal+=addressData["balance"];					//keep running total of balance
						if (addressData["balanceSat"]>0) reqs.push("addr/"+from+"/utxo");//we need to request the utxos for this input
					}
					document.getElementById("balanceTable").innerHTML=html;	//write html code to dom
					document.getElementById("balanceTotal").innerHTML=fundsTotal.toFixed(8);//write total balance found
					closeWindows(true);
					getJSON(reqs).then(function(reqResponses) {				//request utxos for all inputs with DgiByte in them
						utxos=[];											//initialise utxo list
						for (var url in reqResponses) {						//go through each response and get the url requested
							for (var utxo of reqResponses[url]) {			//go through each utxo
								utxos.push(utxo);							//add utxo to list
							}
						}
					},function(e) {
						return e.message;									//stop the page load function and return why ******* doesn't work because asyncronous.  will fix later
					});
				},function(e) {
					return e.message;										//stop the page load function and return why ******* doesn't work because asyncronous.  will fix later
				});		
				
			}
			
			console.log('is seed phrase',isSeedPhrase);
			if (isSeedPhrase) {
				openWindow("bip39");
				
				//lets assume for now all 12 long are bip32 keys
				var seedPhraseLength=privateKeys.length;						//get number of words in seed phrase
				var seedPhrase=privateKeys.join(" ");							//recombine seed phrase into a string
				console.log('seed phrase length:'+seedPhraseLength);
				var trys=[
					{
						"name":"Core Mobile",
						"master":"DigiByte seed",
						"derivation":"m/0'",
						"type":44,
						"length":12
					},
					{
						"name":"DigiByte Go",
						"master":"Bitcoin seed",
						"derivation":"m/44'/0'/0'",
						"type":44,
						"length":12
					},
					{
						"name":"Coinomi",
						"master":"Bitcoin seed",
						"derivation":"m/44'/20'/0'",
						"type":44,
						"length":18
					},
					{
						"name":"Coinomi",
						"master":"Bitcoin seed",
						"derivation":"m/44'/20'/0'",
						"type":44,
						"length":24
					}					
				];
				var tryI=0;
				privateKeys=[];													//make sure private keys where initialised
				var tryNext=function() {										//create function that checks next recovery option.  Not a for loop because of asyncronous calls
					var countNeeded=(trys[tryI].type==32)?1:2;					//initialise counter so we know how many asyncronous calls will be made
					var whenDone=function(data) {								//create function to execute when done since getBip39 is asyncronous and we may be running more then 1 at a time
						for (var pa in data) {									//go through each returned key pair
							if (data[pa].txs>0) {								//only include private keys that have been used
								privateKeys.push(data[pa].pri);					//generate list of private keys like they had typed it in
							}
						}
						if (--countNeeded==0) {									//check if all asyncronous requests done
							if (++tryI==trys.length) {							//see if at the end or not
								finish();										//we reached the end of try list so run the finish up function
							} else {
								tryNext();										//not done yet so try next option
							}	
						}
					}
					if (trys[tryI].length==seedPhraseLength) {					//see if seed phrase is correct length
						document.getElementById('bip39_app').innerHTML=trys[tryI].name;	//show current app trying
						createBip39(trys[tryI].master);								//initialise bip39 object with desired master seed
						if (trys[tryI].type==32) {									//check if wallet is bip 32
							getBip32UsedKeys(seedPhrase,trys[tryI].derivation,0).then(whenDone);			//bip 32 uses single derivateve path
							document.getElementById('bip39_block1').innerHTML='';							//make sure line 2 is blank
						} else {
							getBip32UsedKeys(seedPhrase,trys[tryI].derivation+"/0",0).then(whenDone);		//bip 44 external derivative path
							getBip32UsedKeys(seedPhrase,trys[tryI].derivation+"/1",1).then(whenDone);		//bip 44 internal derivative path			
						}
					} else {													//not correct length so we skip
						countNeeded=1;whenDone();								//skip to next try
					}
				}
				tryNext();														//try first option
			} else {
				finish();														//not a seed phrase so just jump to private key value finder
			}
		
			return true;												//report it loaded fine.  *****  don't actually know because may have failed on async.  need to fix
		}
	}
	
/*_____           _       _            _         _____                 
 |  __ \         (_)     (_)          | |       |  __ \                
 | |__) |___  ___ _ _ __  _  ___ _ __ | |_ ___  | |__) |_ _  __ _  ___ 
 |  _  // _ \/ __| | '_ \| |/ _ \ '_ \| __/ __| |  ___/ _` |/ _` |/ _ \
 | | \ \  __/ (__| | |_) | |  __/ | | | |_\__ \ | |  | (_| | (_| |  __/
 |_|  \_\___|\___|_| .__/|_|\___|_| |_|\__|___/ |_|   \__,_|\__, |\___|
                   | |                                       __/ |     
                   |_|                                      |___/
*/
	var txFee;															//initialise txFee variable
	var recipients={};													//initialise recipients list
	var createTX=function(skip) {									//function to create the fund transaction
		var transaction=new digibyte.Transaction()						//initialize transaction
			.from(utxos);												//include all inputs
		for (var to in recipients) {									//go through each of the recipients set "to" to the address
			if (skip!==true || recipients[to]>0) {						//skip 0 balance recipients if skip is true
				transaction.to(digibyte.Address.fromString(to),Math.round(recipients[to]*100000000));	//add there due amount
			}
		}
		transaction.change(digibyte.Address.fromString('DMw9wz6KHsvbvXsmo1Q8BajWcohYwjqwoq'));	//set change address as donate address 
		transaction.sign(privateKeys);									//sign transaction with private keys
		var newTXfee=transaction.getFee()/100000000;					//calculate new fee required
		if (skip!==true) document.getElementById("recipientsAmount_fee").innerHTML=newTXfee.toFixed(8);//make tx fee visible
		if (newTXfee!=txFee) {											//see if fee has changed.  should only happen while changing values.
			txFee=newTXfee;												//update new value
			return false;												//return false since transaction is invalide
		}
		var message;													//initialise message variable
		try {															//start a error detection block because serialize throws errors some times
			message=transaction.serialize();							//encode the message
		} catch(err) {													//if there was an error then catch it
			message=false;												//set that message failed
			console.log(err);											//make debug log of error
		}
		return message;													//return the serialized message or false if failed
	}
	var updateRemainder=function(skip) {							//function to get remaining unspent amount and update remainder line on dom
		var remainder=fundsTotal;										//initialise remainder with total amount
		for (var address in recipients) {								//go through list of recipients one by one and get there address
			remainder-=recipients[address];								//keep track of the remiander
		}
		createTX(skip);													//create the tx just so we can see how big it is
		remainder-=txFee;												//subtract out tx fee	
		if (skip!==true) {												//if dom skip set true then skip over dom changes
			var domRemainder=document.getElementById("recipientsAmount_donate");//get remainder dom item
			domRemainder.innerHTML=remainder.toFixed(8);				//update change
			domRemainder.style.backgroundColor='rgba(255,0,0,'+(remainder>=0?'0':'1')+')';//make red if invalid value.  clear otherwise
		}
		return remainder;												//return remainder
	}
	var recipientsUpdate=function() {
		var value=parseFloat(this.value);								//get the new value
		if (isNaN(value)) return false;									//check if numeric value before changing
		recipients[this.getAttribute("address")]=value;					//change value
		this.style.backgroundColor='rgba(255,0,0,'+(value<SEND_MIN&&value!=0?'1':'0')+')';//make red if invalid value.  clear otherwise
		updateRemainder();												//update the donate value
	}
	document.getElementById("recipientsAdd").addEventListener('click', function() {
		var domNew=document.getElementById("recipientsNew");			//get the input box
		var newAddress=domNew.value.trim();								//get the new address to add
		if (newAddress=="") return;										//bomb out if empty
		if (!digibyte.Address.isValid(newAddress)) return;				//bomb out if invalid input
		if (Object.keys(recipients).length==0) {						//see if first recipient
			var remainder=updateRemainder(true);						//get the amount of DigiByte that is usable
			recipients[newAddress]=Math.max(remainder*0.99,Math.floor(remainder));	//set default donate to 1% or change which ever is less(logic reverse from commented because actually setting amount)
		} else {
			recipients[newAddress]=recipients[newAddress]||0;			//add recipient to list if not already on list with value of 0
		}
		domNew.value='';												//clear the input box
		var html='<div class="recipientsRow"><div class="recipientsHead">Address</div><div class="recipientsHead">Amount</div></div>';	//initialize table html variable with header
		for (var address in recipients) {								//go through list of recipients one by one and get there address
			html+='<div class="recipientsRow"><div class="recipientsCellAddress">'+address+'</div><input type="number" address="'+address+'" class="recipientsCellAmount" value="'+recipients[address].toFixed(8)+'"></div>';
		}
		html+='<div class="recipientsRow"><div class="recipientsCellAddress">DigiByte.Rocks Donate(Optional but consider supporting us with your change)</div><div id="recipientsAmount_donate" class="recipientsCellAmount"></div></div>';
		html+='<div class="recipientsRow"><div class="recipientsCellAddress">TX Fee</div><div id="recipientsAmount_fee" class="recipientsCellAmount"></div></div>';
		document.getElementById("recipientsTable").innerHTML=html;		//update table html
		updateRemainder();												//update the donate value
		var domAmount=document.getElementsByClassName("recipientsCellAmount");//get all dom items using class recipientsCellAmount
		for (var i=0; i<domAmount.length; i++) {						//go through each dom element with class "recipientsCellAmount"
			domAmount[i].addEventListener('change',recipientsUpdate,false);//listen for change events
		}
		document.getElementById('pageRecipientsNext').disabled=false;	//make next button available
	}, false);


/*
   _____            _     _____                 
  / ____|          | |   |  __ \                
 | (___   ___ _ __ | |_  | |__) |_ _  __ _  ___ 
  \___ \ / _ \ '_ \| __| |  ___/ _` |/ _` |/ _ \
  ____) |  __/ | | | |_  | |  | (_| | (_| |  __/
 |_____/ \___|_| |_|\__| |_|   \__,_|\__, |\___|
                                      __/ |     
                                     |___/ 
*/									 
	$PAGE["pageSent"]={
		valid: function() {											//function executes to validate inputs
			var rCount=0;
			for (var address in recipients) {							//go through each recipient
				var amount=recipients[address];							//get amount to send to them
				if (amount!=0) {										//if amount is 0 ignore it
					rCount++;											//keep traqck of number of real recipients
					if (amount<SEND_MIN) return "Can't send amounts less then "+SEND_MIN;	//if we find an amount that is to small to send bomb out(was already red so they should have known better)
				}
			}
			if (rCount==0) return "No recipients.  If intentionally trying to donate entire amount send to DMw9wz6KHsvbvXsmo1Q8BajWcohYwjqwoq";		//if user has not put in any recipients bomb to protect against accidental next double click
			if (updateRemainder(true)<0) return "Can't send more then you have";//user trying to send to much so bomb out
			return true;												//no errors found so return false
		},
		load: function() {											//function executes when page is loaded by next button
			postJSON('tx/send',{										//post data to server to be distributed to network
				"rawtx": createTX(true)									//get data needed to send to network
			}).then(function(returnedData) {							//when the server responds back will execute this
				document.getElementById("sentTXID").innerHTML=returnedData['txid'];	//show the txid of the message
			},function(e) {												//if there is an error this will execute
				document.getElementById("sentTXID").innerHTML="error: "+e.message;	//show error message
			});
			return true;												//show next page
		}
	}

	loadPage("pageIntro");												//show first page
})(window,document);