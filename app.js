//importing modules
var express = require( 'express' );
var request = require( 'request' );
var cheerio = require( 'cheerio' );

//creating a new express server
var app = express();

//setting EJS as the templating engine
app.set( 'view engine', 'ejs' );

//setting the 'assets' directory as our static assets dir (css, js, img, etc...)
app.use( '/assets', express.static( 'assets' ) );



//Schéma JSON : 
var info = {
    Title: "Information of the real estate",
    price: 0,
    surface: 0,
    pieces: 0,
    city: '',
    codePostal: '',
    type: "",
    prixM2: 0,
};

var estimation = {
    Title: "Estimation of the real estate",
    Averageprice: 0,
    Verdict: "",
}



app.get( '/', function ( req, res ) {
    if ( req.query.lienLBC ) {
        request( req.query.lienLBC, function ( error, response, body ) {
            if ( !error && response.statusCode == 200 ) { //Si in n'y a pas d'erreur 
                var $ = cheerio.load( body );

                //prix du bien 
                $( 'h2.item_price.clearfix span.value' ).each( function ( i, element ) {
                    var a = $( this );
                    info.price = a.text().trim();
                    //console.log(info.price)
                });

                //Surface du bien :
                //On balaye les div qui contiennent un h2 de classe clearfix et un span de class property jusqu'à trouver celui qui contient la Surface :
                $( 'h2.clearfix span.property' ).each( function ( i, element ) {
                    var a = $( this );
                    if ( a.text() == "Surface" ) {
                        info.surface = a.next().text()
                        //console.log(info.surface)
                    }
                });

                //Ville et code postal du bien : 
                $( 'div.line.line_city span.value' ).each( function ( i, element ) {
                    var a = $( this );
                    //On split le résultat qui contient la ville et le code postal dans le même string : 
                    info.city = a.text().split( ' ' )[0];
                    info.codePostal = a.text().split( ' ' )[1];
                    //console.log(info.city)
                    //console.log(info.codePostal)
                });

                //Type du bien : 
                $( 'h2.clearfix span.property' ).each( function ( i, element ) {
                    var a = $( this );
                    if ( a.text() == "Type de bien" ) {
                        info.type = a.next().text()
                        //console.log(info.type)
                    }
                });

                //Nombre de pièces : 
                $( 'h2.clearfix span.property' ).each( function ( i, element ) {
                    var a = $( this );


                    //"Pièces ne passe pas, il ne reconnait pas le è"
                    if ( a.text() == "Pi\350ces" ) {
                        info.pieces = a.next().text()
                        console.log(info.pieces)
                        //Je n'ai pas réussi à afficher le nombre de pièces.
                    }
                });

                //On retire € et les espaces de la chaine de caractères du prix pour ne garder que les chiffres et on converti ensuite en int            
                info.price = info.price.split( " " )[0] + info.price.split( " " )[1];
                info.price = parseInt( info.price );
                //On retire le "m2" de la chaine de caractère de surface : 
                info.surface = parseInt( info.surface );

                //Compute the price per m2 :
                info.prixM2 = info.price / info.surface;
                //console.log(info.prixM2)

                //On va ensuite chercher le prix moyen d'un bien dans la même ville sur une autre site : 


                //On entre directement sur le résultat de la recherche avec la concaténation du site avec la ville - codePostal : 
                request( 'https://www.meilleursagents.com/prix-immobilier/' + info.city.toLowerCase() + '-' + info.codePostal, function ( error, response, body ) {
                    if ( !error && response.statusCode == 200 ) {
                        var averagePrice = "";
                        //Il faut maintenant récupérer le prix moyen du mètre carré : 
                        var $ = cheerio.load( body );
                        $( 'div.small-12.medium-6.columns.prices-summary__cell--row-header ' ).each( function ( i, element ) {
                            var a = $( this );
                            //Si on cherche le prix au m2 d'un appartement : 
                            if ( info.type == "Appartement" ) {

                                if ( a.children()[0].next.data == "Prix m2 appartement" ) {
                                    averagePrice = a.next().next().text();
                                    
                                    //Très étrangement, les chiffres se situent de la position 14 à 19 sur le string...
                                    averagePrice = averagePrice.substring( 14,15 )+averagePrice.substring(16,19);                     
                                    estimation.Averageprice =averagePrice;
                                    //console.log(estimation.averagePrice);
                                    
                                }
                            }
                            //Si on cherche le prix au m2 d'une maison : 
                            if ( info.type == "Maison" ) {
                                if ( a.children()[0].next.data == " Prix m2 maison" ) {
                                    averagePrice = a.next().next().text();

                                    //Très étrangement, les chiffres se situent de la position 14 à 19 sur le string...
                                    averagePrice = averagePrice.substring( 14,15 )+averagePrice.substring(16,19);
                                    estimation.Averageprice = averagePrice;
                                    //console.log(estimation.averagePrice);
                                }
                            }
                        });
                    }
                    //Il ne reste plus qu'à comparer les deux valeurs et donner un verdict : 
                    if ( estimation.Averageprice < info.prixM2 ) {
                        estimation.Verdict = "The price per square meter of this sale is higher than the average for this city."; 
                    }
                    else if ( estimation.Averageprice == info.prixM2 ) {
                        estimation.Verdict = "The price per square meter of this sale is exactly that of the average for this city.";
                    }
                    else {
                        estimation.Verdict = "The price per square meter of this sale is lower than the average for this city.";
                    }


                    //Affichage de l'ensemble des données :
                    res.render( 'home', {

                        message: info.price,message2: info.surface,message3: info.city,message4: info.codePostal,message5: info.type, message6: info.pieces,message7: info.prixM2,message8: estimation.Averageprice,message9: estimation.Verdict,
                    });
                });

            }
            else {
                console.log( error );
            }
        })
    }
    else {
        res.render( 'home', {

            message: info.price, message2: info.surface,message3: info.city,message4: info.codePostal, message5: info.type, message6: info.pieces,message7: info.prixM2,message8: estimation.Averageprice,message9: estimation.Verdict,
        });
    }
});







//launch the server on the 3000 port
app.listen( 3000, function () {
    console.log( 'App listening on port 3000!' );
});








