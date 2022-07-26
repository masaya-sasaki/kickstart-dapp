const {loadFixture} = require('@nomicfoundation/hardhat-network-helpers');
const { expect, assert } = require("chai");
const { ethers } = require('hardhat');

describe("CampaignFactory", function(){
    // Write a fixture that sets up the local hardhat blockchain 
    // to the same state. Run this fixture before every test.
    async function deployCampaignFactoryFixture(){
        const [owner, bob] = await ethers.getSigners();
        const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
        const campaignFactory = await CampaignFactory.deploy()

        return {owner, bob, campaignFactory}
    }

    describe("Deployment", function(){
        it("Should be deployed", async ()=>{
            const {owner, campaignFactory} = await loadFixture(deployCampaignFactoryFixture);
            const contractAddress = campaignFactory.address; 
            expect(contractAddress).to.be.ok; 
        })

        it("Should have the correct owner", async () => {
            const {owner, campaignFactory} = await loadFixture(deployCampaignFactoryFixture);
            const contractOwnerAddress = await campaignFactory.signer.getAddress(); 
            expect(contractOwnerAddress).to.be.equal(owner.address)
        })

    });

    describe("Campaign Creation", function(){
        it("Should be able to create new campaigns", async ()=> {
            const {owner, campaignFactory} = await loadFixture(deployCampaignFactoryFixture); 
            await campaignFactory.createCampaign(0); 
            const campaignAddress = await campaignFactory.deployedCampaigns(0); 
            expect(campaignAddress).to.be.ok
        })

        it("Should be able to get deployed campaign address through getdeployedCampaigns()", async () => {
            const {owner, campaignFactory} = await loadFixture(deployCampaignFactoryFixture); 
            await campaignFactory.createCampaign(0); 
            const campaignAddress = await campaignFactory.deployedCampaigns(0); 
            const getDeployedAddress = await campaignFactory.getDeployedCampaigns();
            expect(campaignAddress).to.equal(getDeployedAddress[0])
        })


    })

    describe("Campaign Contract", function(){
        it("Min Contribution should be set correct", async ()=> {
            const {owner, campaignFactory} = await loadFixture(deployCampaignFactoryFixture); 
            await campaignFactory.createCampaign(0); 
            const campaignAddress = await campaignFactory.deployedCampaigns(0); 
            // To create an instance of contract using campaignaddress. 
            // First, create contract factory for campaign
            const myContract = await ethers.getContractFactory("Campaign")
            // connect with the instance created with attach
            const campaign = await myContract.attach(campaignAddress); 
            // now you can call functions of contract campaign
            const minContribution = await campaign.minimumContribution(); 

            expect(minContribution).to.equals(0);
        })

        it("Should be able to contribute to campaign", async() => {
            const {owner, bob, campaignFactory} = await loadFixture(deployCampaignFactoryFixture); 
            await campaignFactory.createCampaign(0); 
            const campaignAddress = await campaignFactory.deployedCampaigns(0); 
            // To create an instance of contract using campaignaddress. 
            // First, create contract factory for campaign
            const myContract = await ethers.getContractFactory("Campaign")
            // connect with the instance created with attach
            const campaign = await myContract.attach(campaignAddress); 
            // now you can call functions of contract campaign
            // create bob the signer
            const amount = '1'
            const wei = ethers.utils.parseEther(amount)

            // Create a new instance of campaign connected with signer bob
            await campaign.connect(bob).contribute({value: wei})

            const bobAddress = await bob.getAddress()
            const approverCount= await campaign.approversCount(); 
            const approver = await campaign.approvers(bobAddress)
            // add approver count 
            // add bob to approverss
            expect(approverCount).to.equal(1); 
            expect(approver).to.be.true; 
        })

        it("Should require minimum ether to contribute", async () => {
            const {owner, bob, campaignFactory} = await loadFixture(deployCampaignFactoryFixture); 
            await campaignFactory.createCampaign(1); 
            const campaignAddress = await campaignFactory.deployedCampaigns(0); 
            // To create an instance of contract using campaignaddress. 
            // First, create contract factory for campaign
            const myContract = await ethers.getContractFactory("Campaign")
            // connect with the instance created with attach
            const campaign = await myContract.attach(campaignAddress); 
            // now you can call functions of contract campaign
            // create bob the signer
            const amount = '0.5'
            const wei = ethers.utils.parseEther(amount)

            try{
                // Create a new instance of campaign connected with signer bob
                await campaign.connect(bob).contribute({value: wei})
                assert(false); 
            }

            catch(error){
                assert(error)
            }
            
        });

        it("Should allow manager to create requests", async () => {
            const {owner, bob, campaignFactory} = await loadFixture(deployCampaignFactoryFixture); 
            await campaignFactory.createCampaign(1); 
            const campaignAddress = await campaignFactory.deployedCampaigns(0); 
            // To create an instance of contract using campaignaddress. 
            // First, create contract factory for campaign
            const myContract = await ethers.getContractFactory("Campaign")
            // connect with the instance created with attach
            const campaign = await myContract.attach(campaignAddress); 
            // now you can call functions of contract campaign
            // create bob the signer
            const amount = '0.5'
            const wei = ethers.utils.parseEther(amount); 
            await campaign.connect(bob).contribute({value: wei})

            const recipientAddress = await bob.getAddress(); 
            const requestAmount = ethers.utils.parseEther('0.3'); 

            await campaign.connect(owner).createRequest("Buy Notebooks",
                requestAmount,
                recipientAddress
            )

            const request1 = await campaign.connect(owner).requests(0); 
            expect(request1).to.be.ok 
            
        })

        it("Should allow manager to finalize approved requests and transfer ether from campaign to recipient address", async () => {
            const {owner, bob, campaignFactory} = await loadFixture(deployCampaignFactoryFixture); 
            await campaignFactory.createCampaign(1); 
            const campaignAddress = await campaignFactory.deployedCampaigns(0); 
            // To create an instance of contract using campaignaddress. 
            // First, create contract factory for campaign
            const myContract = await ethers.getContractFactory("Campaign")
            // connect with the instance created with attach
            const campaign = await myContract.attach(campaignAddress); 
            // now you can call functions of contract campaign
            // create bob the signer
            const amount = '0.5'
            const wei = ethers.utils.parseEther(amount); 
            await campaign.connect(bob).contribute({value: wei})

            const initialBalance = await bob.getBalance(); 
            console.log(initialBalance)
            const recipientAddress = await bob.getAddress(); 
            const requestAmount = ethers.utils.parseEther('0.3'); 

            await campaign.connect(owner).createRequest("Buy Notebooks",
                requestAmount,
                recipientAddress
            )

            await campaign.connect(bob).approveRequest(0);

            await campaign.connect(owner).finalizeRequest(0); 

            const finalBalance = await bob.getBalance(); 
            const payment = Number(ethers.utils.formatEther(finalBalance.sub(initialBalance)))
            const request1 = await campaign.connect(owner).requests(0); 

            // complete attribute of request is true
            // ether is transferred to recipient of request
            expect(request1.complete).to.be.true; 
            expect(payment).to.be.above(0.29)
        })
    })

});