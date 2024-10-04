import React, { useEffect, useState } from "react";
import logo from "../../assets/logo.png";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/nft";
import { opend } from "../../../declarations/opend";
import { idlFactory as tokenIdlFactory } from "../../../declarations/token";
import { idlFactory } from "../../../declarations/nft";
import { Principal } from "@dfinity/principal";
import Button from "./Button";
import CURRENT_USER_ID from "../index";
import PriceLable from "./PriceLable";
import { canisterId } from "../../../declarations/nft/index";

function Item(props) {

  const [name, setName] = useState();
  const [owner, setOwner] = useState();
  const [image, setImage] = useState();
  const [button, setButton] = useState();
  const [priceInput, setPriceInput] = useState();
  const [loaderHidden, setloaderhidden] = useState(true);
  const [blur, setblur] = useState();
  const [sellStatus, setSellstatus] = useState("");
  const [priceLable, setPriceLable] = useState();
  const [shouldDisplay, setshouldDisplay] = useState(true);

  const id = props.id;

  const localHost = "http://localhost:8080/";
  agent.fetchRootKey();

  const agent = new HttpAgent({ host: localHost });

  let NFTActor;

  async function loadNFT() {
    const NFTActor = await Actor.createActor(idlFactory, {
      agent,
      canisterId: id,
    });
    const name = await NFTActor.getName();
    const owner = await NFTActor.getOwner();
    const imageData = await NFTActor.getAsset();
    const imageContent = new Uint8Array(imageData);
    const image = URL.createObjectURL(new Blob([imageContent.buffer], { type: "image/png" }))

    setName(name);
    setOwner(owner.toText());
    setImage(image);

    if (props.role == "collection") {

      const nftIsListed = await opend.isListed(props.id);

      if (nftIsListed) {
        setOwner("OpenD");
        setblur({ filter: "blur(4px)" });
        setSellstatus("Listed");
      } else {
        setButton(<Button handleClick={handleSell} text={"Sell"} />);
      }

    } else if (props.role == "discover") {
      const originalOwner = await opend.getOriginalOwner(props.id);
      if (originalOwner.toText() != CURRENT_USER_ID.toText()) {
        setButton(<Button handleClick={handleBuy} text={"Buy"} />);
      }
      const price = await opend.getListedNFTPrice(props.id);
      setPriceLable(<PriceLable sellPrice={price.toString()} />);
    }
  }

  useEffect(() => {
    loadNFT();
  }, []);
  let price;
  function handleSell() {
    console.log("sell click")
    setPriceInput(
      <input
        placeholder="Price in DANG"
        type="number"
        className="price-input"
        value={price}
        onChange={(e) => price = e.target.value}
      />
    );
    setButton(<Button handleClick={sellItem} text={"Confirm"} />);
  }

  async function sellItem() {
    setblur({ filter: "blur(4px)" });
    setloaderhidden(false);
    console.log("set price=" + price);
    const listingResult = await opend.listItem(props.id, Number(price));
    console.log("listting:" + listingResult);
    if (listingResult == "Success") {
      const openDId = await opend.getOpenDCanisterID();
      const transferResult = await NFTActor.transferOwnership(openDId);
      console.log("transfer:" + transferResult);
      if (transferResult == "Success") {
        setloaderhidden(true);
        setButton();
        setPriceInput();
        setOwner("OpenD");
      }
    }
  }
  async function handleBuy() {
    console.log("Buy was triggred");
    setloaderhidden(false);
    const tokenActor = await Actor.createActor(tokenIdlFactory, {
      agent,
      canisterId: Principal.fromText(""),
    });
    const sellerId = await opend.getOriginalOwner(props.id);
    const itemPrice = await opend.getListedNFTPrice(props.id);

    const result = await tokenActor.transfer(sellerId, itemPrice);
    console.log(result);
    if (result == "Success") {
      //Transfer to ownership
      const transferResult = await opend.completePurchese(props.id, sellerId, CURRENT_USER_ID);
      console.log("purchase:" + transferResult);
      setloaderhidden(true);
      setshouldDisplay(false);
    }
  }

  return (
    <div style={{ display: shouldDisplay ? "inline" : "none" }} className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image}
          style={blur}
        />
        <div className="lds-ellipsis" hidden={loaderHidden}>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div className="disCardContent-root">
          {priceLable}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}<span className="purple-text">{sellStatus}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner: {owner}
          </p>
          {priceInput}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
