const Crowdsale = artifacts.require("CrowdsaleMock");
const MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
const SHP = artifacts.require("SHP");
const SCD = artifacts.require("SCD");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const FoundersWallet = artifacts.require("FoundersWalletMock");
const ReserveWallet = artifacts.require("ReserveWalletMock");
const assertFail = require("./helpers/assertFail");
const assertBalances = require("./helpers/assertBalances");

contract("Crowdsale", function(accounts) {

    console.log('Logging out all of the accounts for reference...');
    accounts.forEach(acc => console.log(acc));

    const contributorOneAddress = accounts[1];
    const contributorTwoAddress = accounts[2];
    const escrowSignAddress = accounts[3];
    const reserveSignAddress = accounts[4];
    const foundersSignAddress = accounts[5];
    const masterAddress = accounts[6];

    let etherEscrowWallet;
    let foundersWallet;
    let reserveWallet;
    let crowdsale;
    let miniMeTokenFactory;
    let shp;
    let scd;
    let contributionAddress;
    let etherEscrowAddress;
    let foundersAddress;
    let reserveAddress;

    before(async function() {

        miniMeTokenFactory = await MiniMeTokenFactory.new();
        crowdsale = await Crowdsale.new();
        shp = await SHP.new(miniMeTokenFactory.address);
        scd = await SCD.new(miniMeTokenFactory.address);

        etherEscrowWallet = await MultiSigWallet.new([escrowSignAddress], 1);
        foundersWallet = await FoundersWallet.new(shp.address, crowdsale.address); // TODO - could apply multisign to this wallet
        reserveWallet = await ReserveWallet.new(shp.address, crowdsale.address); // TODO - could apply multisign to this wallet
        contributionAddress = crowdsale.address;
        etherEscrowAddress = etherEscrowWallet.address;
        foundersAddress = foundersWallet.address;
        reserveAddress = reserveWallet.address;

        await shp.changeController(crowdsale.address);

        assertBalances.initialize(
            etherEscrowAddress, 
            contributionAddress, 
            contributorOneAddress, 
            contributorTwoAddress, 
            reserveAddress, 
            foundersAddress,
            masterAddress,
            shp);

        await crowdsale.initialize(
            etherEscrowWallet.address, 
            reserveWallet.address, 
            foundersWallet.address, 
            crowdsale.address,
            masterAddress,
            shp.address,
            scd.address);
    });

    it('should have correct addresses and balances', async function() {

        const contributionAddr = await crowdsale.contributionAddress();
        const etherEscrowAddr = await crowdsale.etherEscrowAddress();
        const foundersAddr = await crowdsale.founderAddress();
        const reserveAddr = await crowdsale.reserveAddress();

        assert.equal(contributionAddr, crowdsale.address);
        assert.equal(etherEscrowAddr, etherEscrowWallet.address);
        assert.equal(foundersAddr, foundersWallet.address);
        assert.equal(reserveAddr, reserveWallet.address);

        assertBalances.ether(0, 0, 100, 100, 0, 0, 100);
        await assertBalances.SHP(0, 0, 0, 0, 0, 0, 0);
    });

    it('should not accept contributions before crowdsale has begun', async function() {
        await assertFail(async function() {
            await crowdsale.sendTransaction({
                value: web3.toWei(1),
                gas: 300000, 
                gasPrice: "20000000000", 
                from: contributorOneAddress
            });
        });
        assertBalances.ether(0, 0, 100, 100, 0, 0, 100);
        await assertBalances.SHP(0, 0, 0, 0, 0, 0, 0);
    });

    it('should open the crowdsale with the master address', async function() {
        await crowdsale.setMockedBlockNumber(4567501);
        await crowdsale.sendTransaction({
            value: web3.toWei(1),
            gas: 300000, 
            gasPrice: "20000000000", 
            from: masterAddress
        });
        assertBalances.ether(1, 0, 100, 100, 0, 0, 99);
        await assertBalances.SHP(0, 0, 0, 0, 2000, 1000, 2000);
    });

    it('should not accept contributions from contribution address', async function() {
        await assertFail(async function() {
            await crowdsale.sendTransaction({
                value: web3.toWei(1), 
                gas: 300000, 
                gasPrice: "20000000000", 
                from: crowdsale.address
            });
        });
        assertBalances.ether(1, 0, 100, 100, 0, 0, 99);
        await assertBalances.SHP(0, 0, 0, 0, 2000, 1000, 2000);
    });

    // it('should not accept contributions from ether escrow address', async function() {
    //     await assertFail(async function() {
    //         await crowdsale.sendTransaction({
    //             value: web3.toWei(1), 
    //             gas: 300000, 
    //             gasPrice: "20000000000", 
    //             from: etherEscrowWallet.address
    //         });
    //     });
    //     assertBalances.ether(0, 0, 100, 100, 0, 0, 99);
    //     await assertBalances.SHP(0, 0, 0, 0, 0, 0, 2000);
    // });

    // it('should not accept contributions from founder address', async function() {
    //     await assertFail(async function() {
    //         await crowdsale.sendTransaction({
    //             value: web3.toWei(1), 
    //             gas: 300000, 
    //             gasPrice: "20000000000", 
    //             from: foundersWallet.address
    //         });
    //     });
    //     assertBalances.ether(0, 0, 100, 100, 0, 0, 99);
    //     await assertBalances.SHP(0, 0, 0, 0, 0, 0, 2000);
    // });

    // it('should not accept contributions from reserve address', async function() {
    //     await assertFail(async function() {
    //         await crowdsale.sendTransaction({
    //             value: web3.toWei(1), 
    //             gas: 300000, 
    //             gasPrice: "20000000000", 
    //             from: reserveWallet.address
    //         });
    //     });
    //     assertBalances.ether(0, 0, 100, 100, 0, 0, 99);
    //     await assertBalances.SHP(0, 0, 0, 0, 0, 0, 2000);
    // });

    // it('should prevent 0 ETH contributions', async function() {
    //     await assertFail(async function() {
    //         await crowdsale.sendTransaction({
    //             value: 0,
    //             gas: 300000, 
    //             gasPrice: "20000000000", 
    //             from: contributorOneAddress
    //         });
    //     });
    //     assertBalances.ether(0, 0, 100, 100, 0, 0, 99);
    //     await assertBalances.SHP(0, 0, 0, 0, 0, 0, 2000);
    // });

    // it('should accept Ether from contributor account and generate SHP', async function() {
    //     await crowdsale.sendTransaction({
    //         value: web3.toWei(10),
    //         gas: 300000, 
    //         gasPrice: "20000000000", 
    //         from: contributorOneAddress,
    //         // data: accounts[7]
    //     });
    //     assertBalances.ether(0, 0, 99, 100, 0, 0, 99);
    //     await assertBalances.SHP(0, 0, 2000, 0, 0, 0, 2000);
    // });

    // it('should not allow calling of isContract externally', async function() {
    //     await assertFail(async function() {
    //         await crowdsale.isContract(contributionAddress);
    //     });
    //     assertBalances.ether(0, 0, 99, 100, 0, 0, 99);
    //     await assertBalances.SHP(0, 0, 2000, 0, 0, 0, 2000);
    // });

    // it('should not allow calling of safeCaller externally', async function() {
    //     await assertFail(async function() {
    //         await crowdsale.safeCaller(contributionAddress);
    //     });
    //     assertBalances.ether(0, 0, 99, 100, 0, 0, 99);
    //     await assertBalances.SHP(0, 0, 2000, 0, 0, 0, 2000);
    // });

    // it('should not allow calling of getBlockNumber externally', async function() {
    //     await assertFail(async function() {
    //         await crowdsale.getBlockNumber();
    //     });
    //     assertBalances.ether(0, 0, 99, 100, 0, 0, 99);
    //     await assertBalances.SHP(0, 0, 2000, 0, 0, 0, 2000);
    // });

    // it('should not allow calling of doBuy externally', async function() {
    //     await assertFail(async function() {
    //         await crowdsale.doBuy(contributorOneAddress, 1);
    //     });
    //     assertBalances.ether(0, 0, 99, 100, 0, 0, 99);
    //     await assertBalances.SHP(0, 0, 2000, 0, 0, 0, 2000);
    // });

    // it('should not allow calling of proxyPayment externally', async function() {
    //     await assertFail(async function() {
    //         await crowdsale.proxyPayment(contributorOneAddress);
    //     });
    //     assertBalances.ether(0, 0, 99, 100, 0, 0, 99);
    //     await assertBalances.SHP(0, 0, 2000, 0, 0, 0, 2000);
    // });

    // it('should block contributions when paused & accept when resumed', async function() {
    //     await openContributions();
    //     await crowdsale.pauseContribution();
    //     await assertFail(async function() {
    //         await crowdsale.sendTransaction({
    //             value: web3.toWei(10),
    //             gas: 300000, 
    //             gasPrice: "20000000000", 
    //             from: contributorOneAddress
    //         });
    //     });
    //     assertBalances.ether(1, 0, 90, 100, 0, 0, 93);
    //     await assertBalances.SHP(0, 0, 0, 0, 2000, 1000, 2000);
    //     await crowdsale.resumeContribution();
    //     await crowdsale.sendTransaction({
    //         value: web3.toWei(10),
    //         gas: 300000, 
    //         gasPrice: "20000000000", 
    //         from: contributorOneAddress
    //     });
    //     assertBalances.ether(11, 0, 80, 100, 0, 0, 93);
    //     await assertBalances.SHP(0, 0, 20000, 0, 22000, 11000, 2000);
    // });

    // it('should only allow master address to start contribution phase', async function() {
    //     await assertFail(async function() {
    //         await crowdsale.sendTransaction({
    //             value: web3.toWei(10),
    //             gas: 300000, 
    //             gasPrice: "20000000000", 
    //             from: contributorOneAddress
    //         });
    //     });
    //     assertBalances.ether(0, 0, 80, 100, 0, 0, 93);
    //     await assertBalances.SHP(0, 0, 0, 0, 0, 0, 0);
    // });

    // it('should not allow any more contributions from master address after used to start contribution phase', async function() {
    //     await openContributions();
    //     await assertFail(async function() {
    //         await openContributions();
    //     });
    //     assertBalances.ether(1, 0, 80, 100, 0, 0, 92);
    //     await assertBalances.SHP(0, 0, 0, 0, 2000, 1000, 2000);
    // });

    // it('should not allow pausing when not owner of contract', async function() {
    //     await crowdsale.changeOwner(etherEscrowAddress);
    //     await assertFail(async function() {
    //         await crowdsale.pauseContribution();
    //     });
    //     assertBalances.ether(0, 0, 80, 100, 0, 0, 92);
    //     await assertBalances.SHP(0, 0, 0, 0, 0, 0, 0);
    // });

    // it('should not allow resuming when not owner of contract', async function() {
    //     await crowdsale.changeOwner(etherEscrowAddress);
    //     await assertFail(async function() {
    //         await crowdsale.resumeContribution();
    //     });
    //     assertBalances.ether(0, 0, 80, 100, 0, 0, 92);
    //     await assertBalances.SHP(0, 0, 0, 0, 0, 0, 0);
    // });

    // it('should only allow the owner of the SHP contract to mint SHP tokens', async function() {
    //     await assertFail(async function() {
    //         await shp.mintTokens(1000, contributorOneAddress);
    //     });
    //     assertBalances.ether(0, 0, 80, 100, 0, 0, 92);
    //     await assertBalances.SHP(0, 0, 0, 0, 0, 0, 0);
    // });

    // it('should only allow the owner to initialize', async function() {
    //     await crowdsale.changeOwner(etherEscrowAddress);
    //     await assertFail(async function() {
    //         await crowdsale.initialize(
    //             etherEscrowWallet.address, 
    //             reserveWallet.address, 
    //             foundersWallet.address, 
    //             crowdsale.address,
    //             masterAddress,
    //             shp.address);
    //     });
    //     assertBalances.ether(0, 0, 80, 100, 0, 0, 92);
    //     await assertBalances.SHP(0, 0, 0, 0, 0, 0, 0);
    // });

    // // Limits
    // // TODO - this will be linked to the dynamic ceiling
    // it('should reject contributions greater than the maximum ETH deposit', async function() {});
    // it('should reject contributions if SHP would exceed max supply limit', async function() {});

    // it('should reject attempt to transfer reserve funds before contributions finalized', async function() {
    //     await assertFail(async function() {
    //         await reserveWallet.transfer(web3.toWei(10), contributorTwoAddress);
    //     });
    //     assertBalances.ether(0, 0, 80, 100, 0, 0, 92);
    //     await assertBalances.SHP(0, 0, 0, 0, 0, 0, 0);
    // });

    // it('should reject transfer of SHP from reserve account before 12 month vesting period', async function() {
    //     openContributions();
    //     await crowdsale.sendTransaction({
    //         value: web3.toWei(10),
    //         gas: 300000, 
    //         gasPrice: "20000000000", 
    //         from: contributorOneAddress
    //     });
    //     assertBalances.ether(11, 0, 70, 100, 0, 0, 91);
    //     await assertBalances.SHP(0, 0, 20000, 0, 22000, 11000, 2000);
    //     await crowdsale.finalize();
    //     await assertFail(async function() {
    //         await reserveWallet.transfer(web3.toWei(10), contributorTwoAddress);
    //     });
    //     assertBalances.ether(11, 0, 70, 100, 0, 0, 91);
    //     await assertBalances.SHP(0, 0, 20000, 0, 22000, 11000, 2000);
    // });

    // it('should reject transfer of SHP reserve tokens to another contract address', async function() {
    //     // TODO
    // });

    // it('should allow transfer of SHP from reserve account after 12 month vesting period', async function() {
    //     const t = Math.floor(new Date().getTime() / 1000) + (86400 * 365) + 20000;
    //     await reserveWallet.setMockedTime(t);
    //     openContributions();
    //     await crowdsale.sendTransaction({
    //         value: web3.toWei(10),
    //         gas: 300000, 
    //         gasPrice: "20000000000", 
    //         from: contributorOneAddress
    //     });
    //     assertBalances.ether(11, 0, 60, 100, 0, 0, 90);
    //     await assertBalances.SHP(0, 0, 20000, 0, 22000, 11000, 2000);
    //     await crowdsale.finalize();
    //     await reserveWallet.transfer(web3.toWei(1000), contributorTwoAddress);
    //     assertBalances.ether(11, 0, 60, 100, 0, 0, 90);
    //     await assertBalances.SHP(0, 0, 20000, 1000, 21000, 11000, 2000);
    // });

    // it('should allow reserve SHP to be transferred with multiple signatures', async function() {
    //     // TODO
    // });
    // it('should reject reserve SHP transfer without multiple signatures', async function() {
    //     // TODO
    // });

    // it('should reject transfer of founders SHP tokens before finalized', async function() {
    //     await assertFail(async function() {
    //         await foundersWallet.collectTokens(contributorTwoAddress);
    //     });
    //     assertBalances.ether(0, 0, 60, 100, 0, 0, 90);
    //     await assertBalances.SHP(0, 0, 0, 0, 0, 0, 0);
    // });

    // it('should reject transfer of founders SHP tokens before 6 month vesting period', async function() {
    //     openContributions();
    //     await crowdsale.sendTransaction({
    //         value: web3.toWei(10),
    //         gas: 300000, 
    //         gasPrice: "20000000000", 
    //         from: contributorOneAddress
    //     });
    //     assertBalances.ether(11, 0, 50, 100, 0, 0, 89);
    //     await assertBalances.SHP(0, 0, 20000, 0, 22000, 11000, 2000);
    //     await crowdsale.finalize();
    //     await assertFail(async function() {
    //         await foundersWallet.collectTokens(contributorTwoAddress);
    //     });
    //     assertBalances.ether(11, 0, 50, 100, 0, 0, 89);
    //     await assertBalances.SHP(0, 0, 20000, 0, 22000, 11000, 2000);
    // });

    // it('should reject transfer of SHP founders tokens to another contract address', async function() {
    //     // TODO
    // });
    
    // it('should allow transfer of less than 25% of founders SHP tokens after 6 month vesting period', async function() {
    //     const t = Math.floor(new Date().getTime() / 1000) + (86400 * 180) + 20000;
    //     await foundersWallet.setMockedTime(t);
    //     openContributions();
    //     await crowdsale.sendTransaction({
    //         value: web3.toWei(10),
    //         gas: 300000, 
    //         gasPrice: "20000000000", 
    //         from: contributorOneAddress
    //     });
    //     assertBalances.ether(11, 0, 40, 100, 0, 0, 88);
    //     await assertBalances.SHP(0, 0, 20000, 0, 22000, 11000, 2000);
    //     await crowdsale.finalize();
    //     await foundersWallet.collectTokens(contributorTwoAddress);
    //     assertBalances.ether(11, 0, 40, 100, 0, 0, 88);
    //     await assertBalances.SHP(0, 0, 20000, 2750, 22000, 8250, 2000);
    // });

    // it('should reject transfer of more than 25% of founders SHP tokens after 6 month vesting period', async function() {
    //     const t = Math.floor(new Date().getTime() / 1000) + (86400 * 180) + 20000;
    //     await foundersWallet.setMockedTime(t);
    //     openContributions();
    //     await crowdsale.sendTransaction({
    //         value: web3.toWei(10),
    //         gas: 300000, 
    //         gasPrice: "20000000000", 
    //         from: contributorTwoAddress
    //     });
    //     assertBalances.ether(11, 0, 40, 90, 0, 0, 87);
    //     await assertBalances.SHP(0, 0, 0, 20000, 22000, 11000, 2000);
    //     await crowdsale.finalize();
    //     await assertFail(async function() {
    //         await foundersWallet.collectTokens(contributorTwoAddress);
    //     });
    //     assertBalances.ether(11, 0, 40, 90, 0, 0, 87);
    //     await assertBalances.SHP(0, 0, 0, 20000, 22000, 11000, 2000);
    // });

    // it('should allow transfer of less than 75% of founders SHP tokens after 12 month vesting period', async function() {
    //     const t = Math.floor(new Date().getTime() / 1000) + (86400 * 365) + 20000;
    //     await foundersWallet.setMockedTime(t);
    //     openContributions();
    //     await crowdsale.sendTransaction({
    //         value: web3.toWei(10),
    //         gas: 300000, 
    //         gasPrice: "20000000000", 
    //         from: contributorTwoAddress
    //     });
    //     assertBalances.ether(11, 0, 40, 80, 0, 0, 86);
    //     await assertBalances.SHP(0, 0, 0, 20000, 22000, 11000, 2000);
    //     await crowdsale.finalize();
    //     await foundersWallet.collectTokens(contributorTwoAddress);
    //     assertBalances.ether(11, 0, 40, 80, 0, 0, 86);
    //     await assertBalances.SHP(0, 0, 0, 28250, 22000, 2750, 2000);
    // });

    // it('should reject transfer of more than 75% of founders SHP tokens after 12 month vesting period', async function() {
    //     const t = Math.floor(new Date().getTime() / 1000) + (86400 * 365) + 20000;
    //     await foundersWallet.setMockedTime(t);
    //     openContributions();
    //     await crowdsale.sendTransaction({
    //         value: web3.toWei(10),
    //         gas: 300000, 
    //         gasPrice: "20000000000", 
    //         from: contributorTwoAddress
    //     });
    //     assertBalances.ether(11, 0, 40, 70, 0, 0, 85);
    //     await assertBalances.SHP(0, 0, 0, 20000, 22000, 11000, 2000);
    //     await crowdsale.finalize();
    //     await assertFail(async function() {
    //         await foundersWallet.collectTokens(contributorTwoAddress);
    //     });
    //     assertBalances.ether(11, 0, 40, 70, 0, 0, 85);
    //     await assertBalances.SHP(0, 0, 0, 20000, 22000, 11000, 2000);
    // });

    // it('should allow transfer of 100% of founders SHP tokens after 24 month vesting period', async function() {
    //     const t = Math.floor(new Date().getTime() / 1000) + (86400 * 730) + 20000;
    //     await foundersWallet.setMockedTime(t);
    //     openContributions();
    //     await crowdsale.sendTransaction({
    //         value: web3.toWei(10),
    //         gas: 300000, 
    //         gasPrice: "20000000000", 
    //         from: contributorTwoAddress
    //     });
    //     assertBalances.ether(11, 0, 40, 60, 0, 0, 84);
    //     await assertBalances.SHP(0, 0, 0, 20000, 22000, 11000, 2000);
    //     await crowdsale.finalize();
    //     await foundersWallet.collectTokens(contributorTwoAddress);
    //     assertBalances.ether(11, 0, 40, 60, 0, 0, 84);
    //     await assertBalances.SHP(0, 0, 0, 31000, 22000, 0, 2000);
    // });
    
    // it('should allow founders SHP to be transferred with multiple signatures', async function() {
    //     // TODO
    // });
    // it('should reject founders SHP transfer without multiple signatures', async function() {
    //     // TODO
    // });

    // // Vesting - contributors
    // it('should reject transfer of contributors SHP tokens before contribution period ends', async function() {
    //     // TODO
    // });

    // it('should allow transfer of contributors SHP tokens after contribution period ends', async function() {
    //     // TODO
    // });

    // // Vesting - ETH
    // it('should allow ETH to be transferred after contribution period closes', async function() {
    //     // TODO
    // });

    // it('should reject ETH transfer before contribution period closes', async function() {
    //     // TODO
    // });

    // it('should allow ETH to be transferred with multiple signatures', async function() {
    //     // TODO
    // });

    // it('should reject ETH transfer without multiple signatures', async function() {
    //     // TODO
    // });
});