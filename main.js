
"use strict";

(() => {
    //display home page on-load:
    displayCoins();

    //getting element home link, adding event listener:
    const homeLink = document.getElementById("homeLink");
    const coin = homeLink.addEventListener("click", displayCoins);

    // getting element reports link, adding event listener:
    const reportsLink = document.getElementById("reportsLink");
    reportsLink.addEventListener("click", createReports);

    //getting element about link, adding event listener:
    const aboutLink = document.getElementById("aboutLink");
    aboutLink.addEventListener("click", createAbout);

    //getting element input and div surrounding it:
    const formBox = document.getElementById("formBox");
    const inputSearch = document.getElementById("search");



    // creating home page, also loaded on-load:
    async function getCoinsInfo() {
        const data = await getJson("assets/json/coins.json");
        // displayCoins(data);
        const coins = data.data.coins;
        return coins;
    }

    //displaying coin cards:
    async function displayCoins() {
        const coins = await getCoinsInfo();
        const container = document.getElementById("container");
        let content = "";
        for (let i = 0; i < coins.length; i++) {
            if (coins[i].symbol.length > 5) continue;
            const div = `
            <div class="card">
            <div class="form-check form-switch">
            <input id="${coins[i].name}" class="form-check-input" type="checkbox" role="switch">
            <label class="form-check-label" for="${coins[i].name}"></label>
            </div>
            <div>${coins[i].symbol}</div>
               <div>${coins[i].name}</div>
               <button id="btn${i}" data-coin-id= "${coins[i].symbol}">More Info</button>
               <div class="more-info hidden"></div>
            </div>`;
            content += div;
        }
        //adding the content to the html- creating cards:
        container.innerHTML = content;

        //catching the toggle buttons:
        const switchCheckboxes = document.querySelectorAll(`.form-check-input`);

        //triggering the function that adds the toggled (checked) cards/buttons to map:
        toggledCoins(switchCheckboxes);

        // Load state from local storage and update checkboxes
        loadCheckboxStateFromLocalStorage(switchCheckboxes);

        //adding info to button on-click:
        const buttons = document.querySelectorAll(".card > button");
        for (const btn of buttons) {
            btn.addEventListener("click", toggleMoreInfo);
        }
    }

    // creating the displayed info once clicked:
    async function toggleMoreInfo() {
        const coinId = this.getAttribute("data-coin-id");
        const div = document.querySelector(`button[data-coin-id="${coinId}"] + div`);

        // Check if the div is already visible
        const isHidden = div.classList.contains("hidden");

        // Toggle the "hidden" class
        div.classList.toggle("hidden");

        // If the div is visible, no need to proceed further
        if (!isHidden) {
            return;
        }

        // Remove the "hidden" class before displaying the spinner
        div.classList.remove("hidden");

        // Display loading gif while waiting for the API response
        div.innerHTML = '<img class="spinner" src="assets/images/loading.gif" alt="Loading...">';

        try {
            // Simulate a delay using setTimeout (e.g., 2 seconds)
            // await new Promise(resolve => setTimeout(resolve, 2000));

            // Get and display the info
            const prices = await getMoreInfo(coinId);
            div.innerHTML = `
                <div>USD: $${prices.usd}</div>
                <div>EUR: Є${prices.eur}</div>
                <div>ILS: ₪${prices.ils}</div>
            `;
        } catch (error) {
            // Handle errors, for example, display an error message
            div.innerHTML = '<div class="error-message">Error loading data</div>';
        }
    }


    //function getting the info from user and returning prices:
    async function getMoreInfo(coinId) {
        let prices = JSON.parse(localStorage.getItem(coinId));
        if (prices) return prices;
        const value = await getJson("https://api.exchangerate-api.com/v4/latest/USD")
        const usdValue = await getJson(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${coinId}&tsyms=USD`);
        // const coinInfo = await getJson(url);
        const usd = usdValue[coinId].USD.toFixed(2);
        const eur = (usd * value.rates.EUR).toFixed(2);
        const ils = (usd * value.rates.ILS).toFixed(2);
        prices = { usd, eur, ils };
        localStorage.setItem(coinId, JSON.stringify(prices));
        clearSpecificItemPeriodically(coinId);
        return prices;
    }


    //adding event listener to input:
    inputSearch.addEventListener("input", async () => {
        const userInput = inputSearch.value.toLowerCase();
        const allCards = document.querySelectorAll(".card");

        for (const card of allCards) {
            const coinSymbol = card.querySelector("div:nth-child(2)").textContent.toLowerCase();
            const coinName = card.querySelector("div:nth-child(3)").textContent.toLowerCase();

            if (userInput === "" || coinSymbol.includes(userInput) || coinName.includes(userInput)) {
                // Show the card for the current coin
                card.style.display = "inline-block";
            } else {
                // Hide the card for the current coin
                card.style.display = "none";
            }
        }

        // Check if no cards match the input, display an error message:
        const errorDiv = document.querySelector(".errorDiv");
        const visibleCards = document.querySelectorAll(".card:not([style*='display: none'])");

        if (visibleCards.length === 0 && userInput !== "") {
            const content = `
                <div class="errorDivReplacement">
                    <h2>No coins match your search: <strong>${userInput}</strong></h2>
                    <br>
                    <div class="img-container"><img src="assets/images/whoNotFound.gif"></div>
                </div>`;
            errorDiv.innerHTML = content;
        } else {
            // Clear the error message if there are cards to display
            errorDiv.innerHTML = "";
        }
    });


    //toggle button function: 
    const selectedCoins = new Map();
    let lastSelectedCoin;

    function toggledCoins(switchCheckboxes) {

        for (const checkbox of switchCheckboxes) {
            checkbox.addEventListener("change", function (event) {
                const coinId = event.target.id;

                if (event.target.checked) {
                    // event.target.classList.add('checked');

                    if (selectedCoins.size < 5) {
                        selectedCoins.set(coinId, true);
                        localStorage.setItem(coinId, 'true');
                        event.target.classList.add('checked');
                    }
                    else {
                        if (!selectedCoins.has(coinId)) {
                            event.target.checked = false;
                            lastSelectedCoin = coinId;
                        }
                        // localStorage.setItem(coinId, 'true');
                        showModel(selectedCoins);
                    }
                } else {
                    event.target.classList.remove('checked');
                    selectedCoins.delete(coinId);
                    localStorage.removeItem(coinId);
                }
            });
        }
    }


    //modal functions: 

    //function creating modal:
    let coinSelectionModal = new bootstrap.Modal(document.getElementById("coinSelectionModal"));

    //function showing the modal:
    function showModel(selectedCoins) {
        const selectedCoinsList = document.getElementById("selectedCoinsList");
        let optionsHTML = "";

        // Convert Map keys to an array and iterate
        [...selectedCoins.keys()].forEach((coinId) => {
            optionsHTML += `<option value="${coinId}">${coinId}</option>`;
        });

        selectedCoinsList.innerHTML = optionsHTML;

        // Correct the ID to match the one in your HTML
        coinSelectionModal.show();
    }


    window.replaceSelectedCoin = function () {
        const selectedCoinsList = document.getElementById("selectedCoinsList");
        const selectedCoinId = selectedCoinsList.value;

        if (selectedCoinId) {
            // Remove the previously selected coin from the map and local storage:
            selectedCoins.delete(selectedCoinId);
            localStorage.removeItem(selectedCoinId);

            const lastSelectedCoinElement = document.getElementById(selectedCoinId);
            const SelectedCoin = document.getElementById(lastSelectedCoin);

            if (lastSelectedCoinElement) {
                // Toggle off the checked property for the selected coin:
                lastSelectedCoinElement.checked = !lastSelectedCoinElement.checked;

                // Update the map and local storage based on the new checked status:
                selectedCoins.set(lastSelectedCoin, true);
                localStorage.setItem(lastSelectedCoin, 'true');

                // Toggle on the checked property for the last selected coin:
                SelectedCoin.checked = true;
            }
        }

        coinSelectionModal.hide();
    };


    //creating reports page:
    function createReports() {
        const container = document.getElementById("container");
        container.innerHTML = `<p id="noReports">Sorry. No reports available.</p>`;
    }


    //creating about page:
    function createAbout() {
        const container = document.getElementById("container");
        container.innerHTML = `    <div id="aboutDiv">
        <div id="imageDiv">
            <img src="assets/images/myPhoto.jpeg">
        </div>
        <br><br>
        <div>
        <h3 id="headDiv">Hi, my name is Molly.</h3>
        </div>
        <br>
        <p>
            I am a software developer, currently studying at John-Bryce. 
        </p>
        <br>
        <p>
            I am currently employed at a startup called Phone.do, overseeing a team of freelancers working remotely on an app developed by our skilled development team. 
            Phone.do is a platform that enables the swift launch of a top-notch customer engagement platform through a simple setup process. 
            Everything you need, including technology and gig economy human agents, is readily available. Our dedicated agents ensure that your customers' calls are answered promptly and efficiently, leaving no queries unanswered. 
            Additionally, my ongoing software development studies at John Bryce have proven invaluable in deepening my understanding of how our systems work. 
            This academic pursuit enhances my ability to contribute meaningfully to the dynamic and innovative environment at Phone.do.        
        </p>
        <br>
        <div>
            <h4>
                About my project:
            </h4>
        </div>
        <p>
            "Discover live cryptocurrency prices in multiple currencies with our platform. 
            Stay informed about market trends and make informed decisions. 
            Whether you're a seasoned investor or a newcomer, our user-friendly interface ensures a seamless experience for all crypto enthusiasts. 
            Dive into the world of digital currencies and stay ahead with our real-time market insights."
        </p>
    </div>`
    }


    //general functions:


    //function underline when link clicked.
    document.querySelectorAll('a.link').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('a.link').forEach(otherLink => otherLink.classList.remove('active'));
            link.classList.add('active');
        });
    });

    //function getting json from server:
    async function getJson(url) {
        const response = await fetch(url);
        const json = await response.json();
        return json;
    }

    // clear the local storage after 2 minutes;
    function clearSpecificItemPeriodically(itemKey) {
        setInterval(() => {
            localStorage.removeItem(itemKey);
        }, 2 * 60 * 1000);
    }

    //find the switched on toggles from local storage and turn them on:
    function loadCheckboxStateFromLocalStorage(switchCheckboxes) {
        switchCheckboxes.forEach((checkbox) => {
            const coinId = checkbox.id;
            const isChecked = localStorage.getItem(coinId) === 'true';

            if (isChecked) {
                checkbox.checked = true;
                checkbox.classList.add('checked');
                // Add the coin to the selectedCoins map
                selectedCoins.set(coinId, true);
            }
        });
    }

})();
