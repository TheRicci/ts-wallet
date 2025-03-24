import React ,{useState,useEffect} from 'react';
import {render, Box, Text,useFocus, useInput } from 'ink';
import TextInput from 'ink-text-input';
import inquirer from 'inquirer';
import inquirerFileTreeSelection from 'inquirer-file-tree-selection-prompt';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { info } from 'console';

type PageType = "home" | "transfer" ;
const coins = [{symbol:"USDC", address:"0x"}];

interface infoTxProp{
	balance: number,
	contract?: string
}
interface routingProp{
	setPage: React.Dispatch<React.SetStateAction<pageState>>
}

interface pageState{
	page: PageType,
	infoTx?: infoTxProp
}

const Coin: React.FC<{symbol:string, address?:string, rP:routingProp}> = ({symbol,address,rP}) => {
	const { isFocused } = useFocus();
	const [balance, setBalance] = useState(0.0);

	useEffect(() => {
		//put inside timer
			if (address){
				// check erc-20 token balance
			}
			// check native token balance

		//return timer to clear
	},[]);

    useInput((input, key) => {
        if (isFocused && key.return) {
            console.log('Enter key pressed Home');
			rP.setPage({page:"transfer",infoTx:{balance:balance,contract:address}});
        }
    });

	return (
		<Box margin={1}>
			<Text>{symbol} {balance}</Text>
		</Box>
	);
}

const Home: React.FC<{rP:routingProp}> = ({rP}) => {
	 

	return(
		<Box marginTop={1} borderColor={"magenta"}>
			<Box>
				<Text>Home</Text>
			</Box>
			<Box margin={1} borderColor={"black"}>
				{coins.map((item, index) => (
					<Coin key={index} symbol={item.symbol} address={item.address} rP={rP}/>
				))}
			</Box>
		</Box>
	);
};

const Transfer: React.FC<{rP:routingProp}> = ({rP}) => {
	

	return(
		<Box marginTop={1}>
			<Text>Transfer</Text>
		</Box>
	);
};

const App = ({wallet}:{wallet:ethers.Wallet|ethers.HDNodeWallet}) => {
	console.log(wallet.address);
	const [page, setPage] = useState<pageState>({page:"home"});
	
	
	const pages: Record<PageType, JSX.Element> = {
		home: <Home rP={{setPage}}/>,
		transfer: <Transfer rP={{setPage}}/>,
    };
	return(
		<Box flexDirection="row">{pages[page.page]}</Box>
	);
}

(async () => {   
	inquirer.registerPrompt('file-tree-selection', inquirerFileTreeSelection);
	let wallet:ethers.Wallet | ethers.HDNodeWallet;
	const answers = await inquirer.prompt([
		{
			type: 'confirm',
			name: 'new',
			message: 'Create new wallet?',
			default: false
		},
		{
			type: 'file-tree-selection',
			name: 'foulder',
			message: 'Select a foulder',
			root: '/',  
			onlyShowDir: true,
			when: (answers:any) => answers.new
		},
		{
			type: 'file-tree-selection',
			name: 'file',
			message: 'Select a file',
			root: '/',  
			onlyShowDir: false,
			when: (answers:any) => !answers.new
		},
		{
            type: 'password',
            name: 'password',
            message: 'Enter your password:',
            mask: '🧙',
        }
	  ]);
	let password = answers.password as string;
	if (answers.new) {
		wallet = ethers.Wallet.createRandom()
		const encryptedJson = await wallet.encrypt(password);
 		fs.writeFileSync(path.join(answers.foulder,`${wallet.address.substring(0, 9)}_keystore.json`), encryptedJson, 'utf-8');
	}else{
		let path = answers.file as string;
		console.log(path,password);	
		const encryptedJson = fs.readFileSync(path, 'utf-8');
		wallet = await ethers.Wallet.fromEncryptedJson(encryptedJson, password); //check errors
	}

	console.clear()
	render(
		<App wallet={wallet}/>
		,{exitOnCtrlC:true}
	);
})();
  
