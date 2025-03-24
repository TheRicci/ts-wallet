import React ,{useState} from 'react';
import {render, Box, Text,useFocus, useInput } from 'ink';
import TextInput from 'ink-text-input';
import inquirer from 'inquirer';
import inquirerFileTreeSelection from 'inquirer-file-tree-selection-prompt';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

type PageType = "home" | "transfer" ;

/*
interface fileQueryProps {
	path: string;
	setPage: (page: PageType) => void;
}
*/

interface stringStateProp {
	setString: React.Dispatch<React.SetStateAction<string>>; 
}

interface routingProp{
	setPage: React.Dispatch<React.SetStateAction<PageType>>
}

const PasswordQuery: React.FC<{path:string, rP:routingProp}> = ({path,rP}) => {
	const [password, setPassword] = useState('');

	return (
		<Box>
			<Box marginRight={1}>
				<Text>Password: </Text>
				<TextInput value={password} onChange={setPassword} 
					onSubmit={() => {
						console.log(path,password)
						// check path and passowrd

						rP.setPage("home")
						}}  />
			</Box>
		</Box>
	);
}

const Home: React.FC<{rP:routingProp}> = ({rP}) => {
	const { isFocused } = useFocus();

    useInput((input, key) => {
        if (isFocused && key.return) {
            console.log('Enter key pressed Home');
        }
    });
	return(
		<Box marginRight={1}>
			<Text>Home</Text>
		</Box>
	);
};

const Transfer: React.FC<{rP:routingProp}> = ({rP}) => {
	

	return(
		<Box marginRight={1}>
			<Text>Transfer</Text>
		</Box>
	);
};

const App = ({wallet}:{wallet:ethers.Wallet|ethers.HDNodeWallet}) => {
	console.log(wallet.address);
	const [page, setPage] = useState<PageType>("home");

	const pages: Record<PageType, JSX.Element> = {
		home: <Home rP={{setPage}}/>,
		transfer: <Transfer rP={{setPage}}/>,
    };
	return(
		<Box flexDirection="column">{pages[page]}</Box>
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
  
